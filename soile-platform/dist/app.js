const STAGES=Object.freeze([
  {id:'selected',label:'Команда выбрана',order:0,points:0},
  {id:'plan_confirmed',label:'План подтверждён',order:1,points:100},
  {id:'prototype_confirmed',label:'Прототип подтверждён',order:2,points:150},
  {id:'result_confirmed',label:'Итог подтверждён',order:3,points:250},
].map(stage=>Object.freeze({...stage})));
const VALID_STAGE_STATUSES=new Set(['pending','confirmed','rejected']);

function workflowError(code,message){ const error=new Error(message); error.code=code; return error; }
function assertNonEmptyString(value,name){ if(typeof value!=='string'||value.trim()==='')throw workflowError('invalid_input',`${name} должен быть непустой строкой`); }
function cloneWorkflow(value){ return JSON.parse(JSON.stringify(value)); }
function findStageDefinition(stageId){ return STAGES.find(stage=>stage.id===stageId); }
function assertProject(project){
  if(!project||typeof project!=='object'||Array.isArray(project))throw workflowError('invalid_project','Проект должен быть объектом');
  assertNonEmptyString(project.id,'project.id');
  assertNonEmptyString(project.taskId,'project.taskId');
  assertNonEmptyString(project.teamId,'project.teamId');
  if(!Array.isArray(project.stages)||!Array.isArray(project.history))throw workflowError('invalid_project','Проект должен содержать этапы и историю');
  for(const definition of STAGES){ const stage=project.stages.find(item=>item.id===definition.id); if(!stage||!VALID_STAGE_STATUSES.has(stage.status))throw workflowError('invalid_project',`В проекте отсутствует корректный этап ${definition.id}`); }
}
function calculateTeamPoints(project){ assertProject(project); return project.stages.reduce((total,stage)=>total+(stage.status==='confirmed'?stage.points:0),0); }
function updateProjectFields(project){
  const confirmed=project.stages.filter(stage=>stage.status==='confirmed').sort((left,right)=>left.order-right.order);
  project.currentStageId=confirmed.at(-1)?.id||'selected';
  project.points=calculateTeamPoints(project);
  project.status=project.stages.find(stage=>stage.id==='result_confirmed')?.status==='confirmed'?'completed':'active';
  return project;
}
function createProject(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw workflowError('invalid_input','Параметры проекта должны быть объектом');
  assertNonEmptyString(input.id,'id'); assertNonEmptyString(input.taskId,'taskId'); assertNonEmptyString(input.teamId,'teamId'); assertNonEmptyString(input.selectedBy,'selectedBy');
  const occurredAt=input.occurredAt||new Date().toISOString();
  const stages=STAGES.map(definition=>({...definition,status:definition.id==='selected'?'confirmed':'pending',...(definition.id==='selected'?{confirmedAt:occurredAt,confirmedBy:input.selectedBy}:{})}));
  return {id:input.id.trim(),taskId:input.taskId.trim(),teamId:input.teamId.trim(),businessId:(input.businessId||input.selectedBy).trim(),selectedBy:input.selectedBy.trim(),createdAt:occurredAt,status:'active',currentStageId:'selected',points:0,stages,history:[{action:'stage_confirmed',stageId:'selected',actorId:input.selectedBy.trim(),occurredAt}]};
}
function confirmStage(project,stageId,confirmedBy){
  assertProject(project); assertNonEmptyString(stageId,'stageId'); assertNonEmptyString(confirmedBy,'confirmedBy');
  const definition=findStageDefinition(stageId); if(!definition)throw workflowError('unknown_stage',`Неизвестный этап: ${stageId}`);
  const next=cloneWorkflow(project); const stage=next.stages.find(item=>item.id===stageId); if(stage.status==='confirmed')return updateProjectFields(next);
  if(definition.order>0){ const previous=next.stages.find(item=>item.order===definition.order-1); if(!previous||previous.status!=='confirmed')throw workflowError('stage_order_violation',`Сначала подтвердите этап ${previous?.id||'предыдущий этап'}`); }
  const occurredAt=new Date().toISOString(); stage.status='confirmed'; stage.confirmedAt=occurredAt; stage.confirmedBy=confirmedBy.trim(); delete stage.rejectedAt; delete stage.rejectedBy; delete stage.rejectionReason;
  next.history.push({action:'stage_confirmed',stageId,actorId:confirmedBy.trim(),occurredAt});
  return updateProjectFields(next);
}
function rejectStage(project,stageId,reason){
  assertProject(project); assertNonEmptyString(stageId,'stageId'); assertNonEmptyString(reason,'reason');
  const definition=findStageDefinition(stageId); if(!definition)throw workflowError('unknown_stage',`Неизвестный этап: ${stageId}`); if(stageId==='selected')throw workflowError('stage_not_rejectable','Этап выбора команды нельзя отклонить этим действием');
  const next=cloneWorkflow(project); const stage=next.stages.find(item=>item.id===stageId); if(stage.status==='confirmed')throw workflowError('confirmed_stage_locked','Подтверждённый этап нельзя отклонить'); if(stage.status==='rejected'&&stage.rejectionReason===reason.trim())return updateProjectFields(next);
  const actorId=next.businessId||next.selectedBy||'business'; const occurredAt=new Date().toISOString(); stage.status='rejected'; stage.rejectedAt=occurredAt; stage.rejectedBy=actorId; stage.rejectionReason=reason.trim();
  next.history.push({action:'stage_rejected',stageId,actorId,reason:reason.trim(),occurredAt});
  return updateProjectFields(next);
}
function getProjectTimeline(project){ assertProject(project); const snapshot=cloneWorkflow(project); return snapshot.stages.sort((left,right)=>left.order-right.order).map(stage=>({...stage,events:snapshot.history.filter(event=>event.stageId===stage.id)})); }

const STORAGE_KEY = 'soile-mvp-v1';

const seedTasks = [
  { id:'task-ux-checkout', company:'Nord Market', title:'Снизить отказы при оформлении заказа', theme:'UX / исследование', context:'Покупатели добавляют товары в корзину, но 61% не завершают оформление. Нужно найти проблемные места в мобильной версии и предложить улучшенный сценарий.', users:'Новые покупатели интернет-магазина на мобильных устройствах', data:'Воронка за 3 месяца, обезличенные записи 20 сессий, текущие макеты в Figma', outcome:'Карта проблем и кликабельный прототип улучшенного оформления заказа', criteria:'Не менее 5 подтверждённых проблем; прототип проходит 5 пользовательских тестов', constraints:'3 недели; нельзя менять платёжного провайдера; работа только с обезличенными данными', contact:'Еженедельный созвон по средам, продуктовый менеджер Анна', deadline:'2026-10-30', status:'published', createdAt:1 },
  { id:'task-energy', company:'Qala Energy', title:'Панель контроля энергопотребления офиса', theme:'Data / аналитика', context:'Команда эксплуатации получает показания по зданиям, но не замечает аномалии вовремя. Нужен понятный способ сравнивать расход и находить отклонения.', users:'Инженеры эксплуатации и руководители объектов', data:'CSV с почасовыми показаниями за 12 месяцев и справочник зданий', outcome:'Интерактивный дашборд с фильтрами и сигналами об аномалиях', criteria:'На тестовом наборе обнаружены все 8 размеченных аномалий', constraints:'4 недели; веб-интерфейс; данные нельзя передавать третьим лицам', contact:'Два созвона в неделю, технический специалист Тимур', deadline:'2026-11-12', status:'published', createdAt:2 },
  { id:'task-museum', company:'Городской музей', title:'Сделать маршрут по музею удобнее для школьников', theme:'Сервис / образование', context:'Школьные группы теряют внимание во время длинной экскурсии. Хотим проверить короткий интерактивный маршрут для самостоятельного прохождения.', users:'Школьники 12–16 лет и сопровождающие учителя', data:'План экспозиции, описания 25 объектов, интервью с 4 экскурсоводами', outcome:'Сценарий маршрута и мобильный прототип на 30 минут', criteria:'Не менее 80% тестовой группы проходит маршрут до конца', constraints:'Без установки приложения; использовать только материалы музея', contact:'Куратор доступен по вторникам, обратная связь в течение двух дней', deadline:'2026-11-20', status:'published', createdAt:3 },
  { id:'task-logistics', company:'Steppe Logistics', title:'Понять причины задержек на последней миле', theme:'Data / логистика', context:'Доля доставок позже обещанного окна растёт, но причины фиксируются в свободном тексте и не анализируются системно.', users:'Руководитель логистики и диспетчеры', data:'Обезличенная выгрузка 6 000 доставок и комментарии курьеров', outcome:'Классификация причин задержек и рекомендации по трём главным факторам', criteria:'Не менее 85% записей распределено по понятным категориям', constraints:'2 недели; Python или BI-инструмент; персональные данные исключены', contact:'Чат с аналитиком и один установочный созвон', deadline:'2026-10-25', status:'published', createdAt:4 },
  { id:'task-cafe', company:'TAM Coffee', title:'Проверить формат программы лояльности', theme:'Маркетинг / продукт', context:'Гости часто возвращаются, но действующая бумажная карта почти не используется. Нужно понять ценность цифровой программы лояльности.', users:'Постоянные гости кофеен 18–35 лет', data:'Есть интервью с персоналом и обезличенная статистика покупок', outcome:'Концепция и прототип ключевого сценария', criteria:'', constraints:'Решение должно работать без отдельного мобильного приложения', contact:'Владелец сети отвечает в рабочие дни', deadline:'2026-11-03', status:'published', createdAt:5 }
];

const seedProposals = [
  { id:'p-1', taskId:'task-ux-checkout', team:'NOVA Lab', idea:'Проведём быстрый аудит воронки, пять интервью и соберём новый мобильный прототип.', plan:'Аналитика → интервью → карта пути → прототип → тестирование.', timeline:'3 недели', link:'https://example.com/nova', status:'pending', points:780 },
  { id:'p-2', taskId:'task-energy', team:'Data Nomads', idea:'Соберём дашборд с базовой моделью поиска выбросов и объяснением каждого сигнала.', plan:'Подготовка данных → правила аномалий → интерфейс → проверка.', timeline:'4 недели', link:'https://example.com/data-nomads', status:'pending', points:640 },
  { id:'p-3', taskId:'task-museum', team:'Kórme', idea:'Создадим веб-квест по QR-кодам без установки приложения.', plan:'Сценарий → прототип → тест со школьной группой → доработка.', timeline:'3 недели', link:'', status:'pending', points:520 },
  { id:'p-4', taskId:'task-logistics', team:'Data Nomads', idea:'Разметим причины задержек и построим понятный отчёт с приоритетами.', plan:'Словарь категорий → разметка → анализ → рекомендации.', timeline:'2 недели', link:'https://example.com/logistics', status:'pending', points:640 },
  { id:'p-5', taskId:'task-ux-checkout', team:'Pixel Crew', idea:'Сфокусируемся на доступности и доверии к оплате.', plan:'Экспертный аудит → прототип → коридорное тестирование.', timeline:'18 дней', link:'', status:'pending', points:410 }
];

const blankDraft = { company:'Моя компания', title:'', theme:'UX / исследование', context:'', users:'', data:'', outcome:'', criteria:'', constraints:'', contact:'', deadline:'', aiUsed:false };
const demoDraft = { company:'Qala Mobility', title:'Сократить время ожидания городского транспорта', theme:'Data / аналитика', context:'Пассажиры не понимают, когда прибудет автобус, и тратят лишнее время на остановках. Нужно проверить причины неточных прогнозов и предложить понятный сценарий информирования.', users:'Ежедневные пассажиры городских маршрутов и диспетчеры транспортного оператора', data:'Обезличенная история GPS-позиций за шесть месяцев, расписания маршрутов и 40 обращений пассажиров', outcome:'Интерактивный прототип экрана прибытия и рекомендации по улучшению алгоритма прогноза', criteria:'Средняя ошибка прогноза не превышает трёх минут, а 8 из 10 участников теста понимают время прибытия', constraints:'Четыре недели; только обезличенные данные; решение должно работать в мобильном браузере', contact:'Еженедельный созвон по вторникам, контактное лицо — продуктовый менеджер транспортного оператора', deadline:'2026-12-18', aiUsed:false };
const scoreFields = [ ['context','Контекст и потребность',20,36], ['data','Данные и материалы',20,22], ['outcome','Ожидаемый результат',15,16], ['criteria','Критерии успеха',15,16], ['constraints','Ограничения',10,12], ['users','Пользователи',10,12], ['contact','Связь с бизнесом',10,10] ];

const CURRENT_TEAM = 'NOVA Lab';
const TASK_STATUSES = ['published','in_progress','completed','archived'];

function initialState(){ return { tasks:seedTasks.map(task=>({...task})), proposals:seedProposals.map(proposal=>({...proposal})), projects:[], activity:[], draft:{...blankDraft}, editingTaskId:null, teamPoints:{'NOVA Lab':780,'Data Nomads':640,'Kórme':520,'Pixel Crew':410} }; }
function loadState(){
  try {
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(Array.isArray(parsed?.tasks)&&Array.isArray(parsed?.proposals)&&parsed?.draft){
      const tasks=parsed.tasks.map(task=>{ const status=TASK_STATUSES.includes(task.status)?task.status:'published'; return {...task,status,acceptingResponses:typeof task.acceptingResponses==='boolean'?task.acceptingResponses:status==='published'}; });
      const proposals=parsed.proposals.map(proposal=>({...proposal,status:proposal.status||'pending'}));
      const projects=Array.isArray(parsed.projects)?parsed.projects.map(project=>({...project})):[];
      const teamPoints={...(parsed.teamPoints||initialState().teamPoints)};
      const editingTaskId=tasks.some(task=>task.id===parsed.editingTaskId)?parsed.editingTaskId:null;
      let migrated=false;

      for(const proposal of proposals){
        if(proposal.status!=='accepted')continue;
        if(proposal.rewarded&&!proposal.legacyRewardMigrated){
          teamPoints[proposal.team]=Math.max(0,(teamPoints[proposal.team]??proposal.points??0)-250);
          proposal.rewarded=false;
          proposal.legacyRewardMigrated=true;
          migrated=true;
        }
        if(!projects.some(project=>project.proposalId===proposal.id)){
          const project=createProject({
            id:`project-${proposal.id}`,
            taskId:proposal.taskId,
            teamId:proposal.team,
            businessId:'business-demo',
            selectedBy:'business-demo',
            occurredAt:proposal.acceptedAt||new Date().toISOString(),
          });
          projects.push({...project,proposalId:proposal.id,teamName:proposal.team});
          migrated=true;
        }
      }

      for(const task of tasks){
        const original=parsed.tasks.find(item=>item.id===task.id);
        const linkedProjects=projects.filter(project=>project.taskId===task.id);
        if(original.acceptingResponses===undefined&&isPublished(task)&&linkedProjects.length){
          task.status=linkedProjects.every(project=>project.status==='completed')?'completed':'in_progress';
          task.acceptingResponses=false;
          migrated=true;
        }
      }

      const restored={...parsed,tasks,proposals,projects,activity:Array.isArray(parsed.activity)?parsed.activity:[],draft:{...blankDraft,...parsed.draft},editingTaskId,teamPoints};
      if(migrated)localStorage.setItem(STORAGE_KEY,JSON.stringify(restored));
      return restored;
    }
  } catch(error){ console.warn('Не удалось загрузить данные',error); }
  return initialState();
}

let state=loadState();
let role='business';
let currentView='builder';
let catalogFilter='all';
let searchQuery='';
let activeProjectId=null;
let responseTaskFilter=null;
let taskListMode='active';
let pendingArchiveTaskId=null;
const app=document.querySelector('#app');
const nav=document.querySelector('#main-nav');
const toast=document.querySelector('#toast');
const aiDialog=document.querySelector('#ai-dialog');
const taskDialog=document.querySelector('#task-dialog');
const proposalDialog=document.querySelector('#proposal-dialog');
const archiveDialog=document.querySelector('#archive-dialog');

function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
const actionIcons = {
  open:'<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.75"/></svg>',
  edit:'<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.1-.9L19 8.2a2.1 2.1 0 0 0-3-3L5.1 16.1 4 20Z"/><path d="m14.7 6.5 2.8 2.8"/></svg>',
  archive:'<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h16V20H4zM3 4h18v4.5H3z"/><path d="M9 13h6"/></svg>',
  restore:'<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8v5h5"/><path d="M6.2 17.2A8 8 0 1 0 5 8.5"/></svg>'
};
function isPublished(task){ return (task.status||'published')==='published'; }
function isVisibleToStudents(task){ return (task.status||'published')!=='archived'; }
function isDeadlineOpen(task){ return !task.deadline||new Date(`${task.deadline}T23:59:59`).getTime()>=Date.now(); }
function canAcceptResponses(task){ return isPublished(task)&&task.acceptingResponses!==false&&isDeadlineOpen(task); }
function activeProposals(taskId){ return state.proposals.filter(proposal=>proposal.taskId===taskId&&proposal.status!=='withdrawn'); }
function findTeamProposal(taskId,team=CURRENT_TEAM){ return state.proposals.find(proposal=>proposal.taskId===taskId&&proposal.team.trim().toLowerCase()===team.trim().toLowerCase()&&proposal.status!=='withdrawn'); }
function taskStatus(task){
  if((task.status||'published')==='archived')return{label:'В архиве',className:'archived'};
  if(task.status==='in_progress')return{label:'В работе',className:'in-progress'};
  if(task.status==='completed')return{label:'Завершена',className:'completed'};
  if(!isDeadlineOpen(task))return{label:'Срок истёк',className:'closed'};
  if(task.acceptingResponses===false)return{label:'Приём закрыт',className:'closed'};
  return{label:'Принимает отклики',className:'accepting'};
}
function logActivity(message,{audience=['business','student'],taskId=null,actor=role}={}){ state.activity.unshift({id:`event-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,message,audience,taskId,actor,createdAt:Date.now(),readBy:[actor]}); }
function taskToDraft(task){ return Object.fromEntries(Object.keys(blankDraft).map(key=>[key,task[key]??blankDraft[key]])); }
function projectForProposal(proposalId){ return state.projects.find(project=>project.proposalId===proposalId); }
function projectForId(projectId){ return state.projects.find(project=>project.id===projectId); }
function teamProjectPoints(team){ return state.projects.filter(project=>project.teamName===team||project.teamId===team).reduce((total,project)=>total+calculateTeamPoints(project),0); }
function teamScore(team){ return (state.teamPoints[team]||0)+teamProjectPoints(team); }
function nextProjectStage(project){ return project.stages.find(stage=>stage.id!=='selected'&&stage.status!=='confirmed')||null; }
function stageStatusLabel(status){ return {confirmed:'Подтверждён',rejected:'Отклонён',pending:'Ожидает'}[status]||status; }
function scoreTask(task){ const items=scoreFields.map(([key,label,weight,min])=>{ const text=(task[key]||'').trim(); const earned=text.length>=min?weight:0; return {key,label,weight,earned}; }); return {total:items.reduce((sum,item)=>sum+item.earned,0),items}; }
function readiness(score){ if(score>=90)return{label:'Приоритетная',className:'priority',copy:'Полностью готова к работе и выделяется в каталоге.'}; if(score>=70)return{label:'Готовая',className:'ready',copy:'Хорошо описана и получает повышенную позицию.'}; if(score>=40)return{label:'Рабочая',className:'working',copy:'Студенты могут откликаться; детали ещё можно усилить.'}; return{label:'Черновик',className:'draft',copy:'Видна в каталоге, но требует дополнительных уточнений.'}; }
function showToast(message){ toast.textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2600); }
function formatDate(value){ if(!value)return'Срок не указан'; return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`)); }
function emptyState(title,text){ return `<div class="empty-state"><h3>${title}</h3><p>${text}</p></div>`; }

function renderNav(){
  const unread=state.activity.filter(item=>(item.audience||[]).includes(role)&&!(item.readBy||[]).includes(role)).length;
  const activity=['activity',`События${unread?` · ${unread}`:''}`];
  const business=[['builder','Конструктор'],['tasks','Мои задачи'],['responses',`Отклики · ${state.proposals.filter(p=>p.status==='pending').length}`],['projects',`Проекты · ${state.projects.length}`],activity];
  const student=[['catalog','Каталог'],['my-responses','Мои отклики'],['my-projects','Мои проекты'],activity];
  const activeView=currentView==='project-detail'?(role==='business'?'projects':'my-projects'):currentView;
  nav.innerHTML=(role==='business'?business:student).map(([id,label])=>`<button class="nav-button ${activeView===id?'active':''}" data-view="${id}">${label}</button>`).join('');
  document.querySelectorAll('.role-button').forEach(button=>button.classList.toggle('active',button.dataset.role===role));
}
function setView(view){ if(view==='responses')responseTaskFilter=null; if(view==='tasks')taskListMode='active'; currentView=view; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function render(){ renderNav(); if(currentView==='builder')renderBuilder(); if(currentView==='tasks')renderBusinessTasks(); if(currentView==='responses')renderResponses(); if(currentView==='projects')renderProjects(); if(currentView==='project-detail')renderProjectDetail(activeProjectId); if(currentView==='catalog')renderCatalog(); if(currentView==='my-responses')renderMyResponses(); if(currentView==='my-projects')renderProjects(CURRENT_TEAM); if(currentView==='activity')renderActivity(); }

function renderBuilder(){
  const editingTask=state.tasks.find(task=>task.id===state.editingTaskId); const isEditing=Boolean(editingTask);
  const scored=scoreTask(state.draft); const level=readiness(scored.total);
  app.innerHTML=`<section class="page"><header class="page-head"><div><p class="eyebrow">${isEditing?'Редактирование задачи':'Новая задача'} / конструктор</p><h1 class="page-title">${isEditing?'Обновите задачу без потери откликов':'Сделайте задачу понятной — до первого отклика'}</h1><p class="page-subtitle">${isEditing?'Изменения сохранятся в текущей карточке с тем же идентификатором.':'Опишите потребность своими словами. Рейтинг покажет, чего не хватает, а AI задаст вопросы, которые помогут улучшить карточку.'}</p></div></header>
  <div class="builder-layout"><section class="panel"><div class="panel-body"><div class="panel-topline"><span class="stage-pill">${isEditing?'02 · Редактирование':'01 · Черновик'}</span>${state.draft.aiUsed?'<span class="badge ai">AI дополнение подтверждено</span>':'<span class="badge">Автосохранение</span>'}</div>
  <form id="builder-form" class="form-grid">
  <label><span>Компания</span><input name="company" value="${escapeHtml(state.draft.company)}" placeholder="Название компании" /></label>
  <label><span>Тема</span><select name="theme">${['UX / исследование','Data / аналитика','Маркетинг / продукт','Сервис / образование','Разработка / автоматизация'].map(x=>`<option ${state.draft.theme===x?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="full"><span>Название задачи</span><input name="title" value="${escapeHtml(state.draft.title)}" placeholder="Например: сократить время обработки обращений" /></label>
  <label class="full"><span>Контекст и потребность</span><textarea name="context" rows="4" placeholder="Что происходит сейчас и что необходимо изменить">${escapeHtml(state.draft.context)}</textarea><small class="form-hint">Опишите проблему, а не готовое решение.</small></label>
  <label><span>Для кого создаётся решение</span><input name="users" value="${escapeHtml(state.draft.users)}" placeholder="Пользователи или сотрудники" /></label>
  <label><span>Срок</span><input name="deadline" type="date" value="${escapeHtml(state.draft.deadline)}" /></label>
  <label class="full"><span>Доступные данные и материалы</span><textarea name="data" rows="3" placeholder="Документы, интервью, выгрузки, примеры">${escapeHtml(state.draft.data)}</textarea></label>
  <label class="full"><span>Ожидаемый результат</span><textarea name="outcome" rows="3" placeholder="Что должна передать команда">${escapeHtml(state.draft.outcome)}</textarea></label>
  <label><span>Критерии успеха</span><textarea name="criteria" rows="3" placeholder="Как понять, что решение подходит">${escapeHtml(state.draft.criteria)}</textarea></label>
  <label><span>Ограничения</span><textarea name="constraints" rows="3" placeholder="Сроки, технологии, доступы">${escapeHtml(state.draft.constraints)}</textarea></label>
  <label class="full"><span>Связь с бизнесом</span><input name="contact" value="${escapeHtml(state.draft.contact)}" placeholder="Контакт, формат консультаций, срок ответа" /></label></form>
  <div class="form-actions"><button class="primary-button" id="ai-button" type="button">Уточнить с AI <span>↗</span></button><button class="secondary-button" id="demo-button" type="button">Заполнить демо-пример</button><button class="secondary-button" id="publish-button" type="button">${isEditing?'Сохранить изменения':'Опубликовать в каталог'}</button><button class="text-button" id="reset-button" type="button">${isEditing?'Отменить редактирование':'Очистить'}</button></div></div></section>
  <aside class="panel score-panel"><div class="panel-body"><p class="eyebrow light">Рейтинг готовности</p><div class="score-big"><strong id="score-value">${scored.total}</strong><span>/100</span></div><span id="score-status" class="status-pill ${level.className}">${level.label}</span><p class="score-copy" id="score-copy">${level.copy}</p><div class="progress" aria-label="${scored.total} процентов готовности"><span id="score-progress" style="width:${scored.total}%"></span></div><ul class="score-list" id="score-list">${renderScoreItems(scored.items)}</ul><div class="score-foot">Низкий рейтинг не скрывает задачу. Баллы начисляются только за заполненные и подтверждённые сведения.</div></div></aside></div></section>`;
  document.querySelector('#builder-form').addEventListener('input',event=>{ if(!event.target.name)return; state.draft[event.target.name]=event.target.value; state.draft.aiUsed=false; saveState(); updateBuilderScore(); });
  document.querySelector('#ai-button').addEventListener('click',openAiQuestions);
  document.querySelector('#demo-button').addEventListener('click',fillDemoDraft);
  document.querySelector('#publish-button').addEventListener('click',publishDraft);
  document.querySelector('#reset-button').addEventListener('click',()=>{ if(isEditing){ cancelEditing(); return; } state.draft={...blankDraft}; saveState(); renderBuilder(); showToast('Черновик очищен'); });
}

function renderScoreItems(items){ return items.map(item=>`<li class="${item.earned===item.weight?'complete':''}"><span>${item.label}</span><b>${item.earned}/${item.weight}</b></li>`).join(''); }
function updateBuilderScore(){ const scored=scoreTask(state.draft); const level=readiness(scored.total); document.querySelector('#score-value').textContent=scored.total; document.querySelector('#score-status').textContent=level.label; document.querySelector('#score-status').className=`status-pill ${level.className}`; document.querySelector('#score-copy').textContent=level.copy; document.querySelector('#score-progress').style.width=`${scored.total}%`; document.querySelector('#score-list').innerHTML=renderScoreItems(scored.items); }
function openAiQuestions(){ const questions=[{key:'ai-result',label:state.draft.outcome?'Как проверить, что указанный результат действительно полезен?':'Какой конкретный результат должна передать команда?',value:state.draft.outcome},{key:'ai-evidence',label:state.draft.data?'Какие из этих материалов команда получит в первый день?':'Какие данные, материалы или примеры уже доступны?',value:state.draft.data},{key:'ai-success',label:'По каким измеримым признакам бизнес примет решение?',value:state.draft.criteria},{key:'ai-boundaries',label:'Какие сроки, технологии или доступы ограничивают решение?',value:state.draft.constraints}]; document.querySelector('#ai-questions').innerHTML=questions.map((q,i)=>`<label><span>${i+1}. ${q.label}</span><textarea id="${q.key}" rows="2" required>${escapeHtml(q.value)}</textarea></label>`).join(''); aiDialog.showModal(); document.body.classList.add('dialog-open'); }
document.querySelector('#ai-form').addEventListener('submit',event=>{ event.preventDefault(); const result=document.querySelector('#ai-result').value.trim(); const evidence=document.querySelector('#ai-evidence').value.trim(); const success=document.querySelector('#ai-success').value.trim(); const boundaries=document.querySelector('#ai-boundaries').value.trim(); if(!result||!evidence||!success||!boundaries){ showToast('Ответьте на все вопросы — AI не будет додумывать факты'); return; } state.draft.outcome=result; state.draft.data=evidence; state.draft.criteria=success; state.draft.constraints=boundaries; state.draft.aiUsed=true; saveState(); aiDialog.close(); document.body.classList.remove('dialog-open'); renderBuilder(); showToast('Карточка дополнена. Проверьте формулировки перед публикацией'); });
function fillDemoDraft(){ state.draft={...demoDraft}; saveState(); renderBuilder(); showToast('Демо-пример заполнен. Все поля можно изменить'); }
function startEditingTask(id){ const task=state.tasks.find(item=>item.id===id); if(!task)return; state.editingTaskId=task.id; state.draft=taskToDraft(task); saveState(); if(taskDialog.open)taskDialog.close(); role='business'; setView('builder'); }
function cancelEditing(){ state.editingTaskId=null; state.draft={...blankDraft}; saveState(); setView('tasks'); showToast('Редактирование отменено. Задача не изменена'); }
function openNewTaskBuilder(){ if(state.editingTaskId){ state.editingTaskId=null; state.draft={...blankDraft}; saveState(); } setView('builder'); }
function publishDraft(){
  if(!state.draft.title.trim()||!state.draft.context.trim()){ showToast('Добавьте название и контекст задачи'); return; }
  const taskIndex=state.tasks.findIndex(task=>task.id===state.editingTaskId);
  if(taskIndex>=0){
    const original=state.tasks[taskIndex];
    state.tasks[taskIndex]={...original,...state.draft,id:original.id,status:original.status||'published',createdAt:original.createdAt};
    logActivity(`Задача «${state.draft.title}» обновлена`,{taskId:original.id,audience:['business']});
    state.editingTaskId=null;
    state.draft={...blankDraft};
    saveState();
    setView('tasks');
    showToast('Изменения сохранены. Рейтинг задачи обновлён');
    return;
  }
  const newTask={...state.draft,id:`task-${Date.now()}`,status:'published',acceptingResponses:true,createdAt:Date.now()};
  state.tasks.push(newTask);
  logActivity(`Опубликована задача «${newTask.title}»`,{taskId:newTask.id});
  state.editingTaskId=null;
  state.draft={...blankDraft};
  saveState();
  setView('tasks');
  showToast('Задача опубликована в общем каталоге');
}

function openArchiveConfirmation(id){
  const task=state.tasks.find(item=>item.id===id);
  if(!task||task.status==='archived')return;
  pendingArchiveTaskId=id;
  document.querySelector('#archive-task-name').textContent=`«${task.title}»`;
  if(taskDialog.open)taskDialog.close();
  archiveDialog.showModal();
  document.body.classList.add('dialog-open');
}

function setTaskArchived(id,archived){
  const task=state.tasks.find(item=>item.id===id);
  if(!task)return;
  task.status=archived?'archived':'published';
  const hasAccepted=state.proposals.some(proposal=>proposal.taskId===task.id&&proposal.status==='accepted');
  task.acceptingResponses=archived?false:isDeadlineOpen(task)&&!hasAccepted;
  logActivity(archived?`Задача «${task.title}» перемещена в архив`:`Задача «${task.title}» восстановлена`,{taskId:task.id});
  saveState();
  if(taskDialog.open)taskDialog.close();
  if(archiveDialog.open)archiveDialog.close();
  pendingArchiveTaskId=null;
  currentView='tasks';
  renderBusinessTasks();
  renderNav();
  showToast(archived?'Задача перемещена в архив':'Задача восстановлена и снова видна в каталоге');
}

function setTaskStatus(id,status){
  const task=state.tasks.find(item=>item.id===id);
  if(role!=='business'||!task||!['published','in_progress','completed'].includes(status))return;
  const unfinishedProject=state.projects.find(project=>project.taskId===id&&project.status!=='completed');
  if(status==='completed'&&unfinishedProject){
    if(taskDialog.open)taskDialog.close();
    activeProjectId=unfinishedProject.id;
    setView('project-detail');
    showToast('Сначала подтвердите итоговый этап каждого проекта задачи');
    return;
  }
  if(status==='in_progress'&&!state.proposals.some(proposal=>proposal.taskId===id&&proposal.status==='accepted')){ showToast('Сначала выберите команду для этой задачи'); return; }
  const labels={published:'снова опубликована',in_progress:'переведена в работу',completed:'завершена'};
  task.status=status;
  task.acceptingResponses=status==='published'&&isDeadlineOpen(task);
  logActivity(`Задача «${task.title}» ${labels[status]}`,{taskId:task.id});
  saveState();
  if(taskDialog.open)taskDialog.close();
  renderBusinessTasks();
  renderNav();
  showToast(status==='completed'?'Задача завершена':status==='in_progress'?'Задача в работе':'Задача снова принимает отклики');
}

function toggleAcceptingResponses(id){
  const task=state.tasks.find(item=>item.id===id);
  if(!task||!isPublished(task))return;
  if(!isDeadlineOpen(task)){ showToast('Нельзя открыть приём после дедлайна. Сначала измените срок'); return; }
  task.acceptingResponses=task.acceptingResponses===false;
  logActivity(`${task.acceptingResponses?'Открыт':'Закрыт'} приём откликов на задачу «${task.title}»`,{taskId:task.id});
  saveState();
  if(taskDialog.open)taskDialog.close();
  renderBusinessTasks();
  renderNav();
  showToast(task.acceptingResponses?'Приём откликов открыт':'Приём откликов приостановлен');
}

function renderBusinessTaskCard(task){
  const score=scoreTask(task).total; const level=readiness(score); const count=activeProposals(task.id).length; const status=taskStatus(task); const archived=task.status==='archived';
  const hasAccepted=state.proposals.some(proposal=>proposal.taskId===task.id&&proposal.status==='accepted');
  const lifecycle=task.status==='published'?`<button class="secondary-button small-button" data-toggle-accepting="${task.id}">${canAcceptResponses(task)?'Закрыть приём':'Открыть приём'}</button>${hasAccepted?`<button class="primary-button small-button" data-task-status="in_progress" data-task-id="${task.id}">Начать работу</button>`:''}`:task.status==='in_progress'?`<button class="primary-button small-button" data-task-status="completed" data-task-id="${task.id}">Завершить</button>`:task.status==='completed'?`<button class="secondary-button small-button" data-task-status="in_progress" data-task-id="${task.id}">Вернуть в работу</button>`:'';
  return `<article class="list-card ${archived?'is-archived':''}"><div class="mini-score">${score}</div><div><div class="task-statuses"><span class="status-pill ${level.className}">${level.label}</span><span class="status-pill ${status.className}">${status.label}</span></div><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.company)} · ${escapeHtml(task.theme)} · ${formatDate(task.deadline)}</p></div><div class="list-actions">${lifecycle}<button class="secondary-button task-action icon-action-button" data-open-task="${task.id}" aria-label="Открыть" title="Открыть">${actionIcons.open}</button><button class="secondary-button task-action icon-action-button" data-edit-task="${task.id}" aria-label="Редактировать" title="Редактировать">${actionIcons.edit}</button>${archived?`<button class="secondary-button task-action icon-action-button" data-restore-task="${task.id}" aria-label="Восстановить" title="Восстановить">${actionIcons.restore}</button>`:`<button class="danger-button task-action icon-action-button" data-archive-task="${task.id}" aria-label="Архивировать" title="Архивировать">${actionIcons.archive}</button>`}<button class="primary-button small-button" data-task-responses="${task.id}">${count} откликов</button></div></article>`;
}

function renderBusinessTasks(){
  const allTasks=[...state.tasks].reverse();
  const tasks=allTasks.filter(task=>taskListMode==='archived'?task.status==='archived':task.status!=='archived');
  const publishedCount=allTasks.filter(canAcceptResponses).length; const archivedCount=allTasks.filter(task=>task.status==='archived').length;
  const heading=taskListMode==='archived'?{eyebrow:'Сохранённые задачи',title:'Архив',copy:'Здесь хранятся скрытые из каталога задачи. Отклики и история изменений сохранены.'}:{eyebrow:'Рабочий стол бизнеса',title:'Ваши задачи',copy:'Редактируйте опубликованные карточки без потери откликов и управляйте их видимостью в каталоге.'};
  const archiveButton=taskListMode==='archived'?'← Активные задачи':`Архив <span>${archivedCount}</span>`;
  const empty=taskListMode==='archived'?emptyState('Архив пока пуст','Архивированные задачи появятся здесь и будут доступны для восстановления.'):emptyState('Активных задач пока нет','Создайте новую задачу или восстановите карточку из архива.');
  app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">${heading.eyebrow}</p><h1 class="page-title medium">${heading.title}</h1><p class="page-subtitle">${heading.copy}</p></div><div class="page-head-actions"><button class="secondary-button archive-view-button ${taskListMode==='archived'?'is-active':''}" data-task-list-mode="${taskListMode==='archived'?'active':'archived'}">${archiveButton}</button><button class="primary-button" data-new-task>Новая задача <span>＋</span></button></div></header>
  <div class="stats-row"><div class="stat-card"><strong>${publishedCount}</strong><span>принимают отклики</span></div><div class="stat-card"><strong>${allTasks.filter(task=>task.status==='in_progress').length}</strong><span>в работе</span></div><div class="stat-card"><strong>${allTasks.filter(task=>task.status==='completed').length}</strong><span>завершено</span></div><div class="stat-card"><strong>${archivedCount}</strong><span>в архиве</span></div></div>
  <div class="list-stack">${tasks.length?tasks.map(renderBusinessTaskCard).join(''):empty}</div></section>`;
}

function renderResponses(taskId=responseTaskFilter){ responseTaskFilter=taskId; const proposals=state.proposals.filter(p=>!taskId||p.taskId===taskId); app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">Решение принимает бизнес</p><h1 class="page-title medium">Отклики команд</h1><p class="page-subtitle">Сравните идеи и планы. Принятый отклик переводит задачу в работу и закрывает приём новых предложений.</p></div>${taskId?'<button class="secondary-button" data-all-responses>Все отклики</button>':''}</header><div class="list-stack">${proposals.length?proposals.map(renderProposalCard).join(''):emptyState('Откликов пока нет','После публикации задачи здесь появятся предложения студенческих команд.')}</div></section>`; }
function renderProposalCard(proposal){
  const task=state.tasks.find(t=>t.id===proposal.taskId);
  const project=projectForProposal(proposal.id);
  const statusLabel={pending:'На рассмотрении',accepted:'Принята',declined:'Отклонена',withdrawn:'Отозвана командой'}[proposal.status]||proposal.status;
  const decisionActions=proposal.status==='pending'
    ? `<div class="proposal-actions"><button class="primary-button" data-decision="accepted" data-proposal="${proposal.id}">Выбрать команду</button><button class="danger-button" data-decision="declined" data-proposal="${proposal.id}">Отклонить</button></div>`
    : `<div class="proposal-actions"><span class="status-pill ${proposal.status==='accepted'?'ready':'draft'}">${statusLabel}</span>${project?`<button class="secondary-button" data-open-project="${project.id}">Открыть проект</button>`:''}</div>`;
  return `<article class="proposal-card"><div class="proposal-card-head"><div><p class="eyebrow muted">${escapeHtml(task?.title||'Задача')}</p><h3>${escapeHtml(proposal.team)}</h3><p class="decision-note">${escapeHtml(proposal.timeline)} ${proposal.link?`· <a href="${escapeHtml(proposal.link)}" target="_blank" rel="noreferrer">прототип</a>`:''}</p></div><div class="team-score"><span>${teamScore(proposal.team)}</span> баллов</div></div><div class="proposal-grid"><div><h4>Идея</h4><p>${escapeHtml(proposal.idea)}</p></div><div><h4>План</h4><p>${escapeHtml(proposal.plan)}</p></div></div>${decisionActions}</article>`;
}
function updateDecision(id,decision){
  if(role!=='business')return;
  const proposal=state.proposals.find(item=>item.id===id);
  if(!proposal||proposal.status!=='pending'||!['accepted','declined'].includes(decision))return;
  const task=state.tasks.find(item=>item.id===proposal.taskId);
  if(!task||!['published','in_progress'].includes(task.status||'published')){ showToast('Решение доступно только для опубликованной задачи или задачи в работе'); return; }
  const action=decision==='accepted'?'выбрать':'отклонить';
  if(!window.confirm(`Подтвердить: ${action} отклик команды «${proposal.team}»?`))return;
  proposal.status=decision;
  if(decision==='accepted'){
    proposal.acceptedAt=proposal.acceptedAt||new Date().toISOString();
    proposal.rewarded=false;
    if(!projectForProposal(proposal.id)){
      const project=createProject({
        id:`project-${proposal.id}`,
        taskId:proposal.taskId,
        teamId:proposal.team,
        businessId:'business-demo',
        selectedBy:'business-demo',
        occurredAt:proposal.acceptedAt,
      });
      state.projects.push({...project,proposalId:proposal.id,teamName:proposal.team});
    }
    task.status='in_progress';
    task.acceptingResponses=false;
    logActivity(`Команда «${proposal.team}» выбрана для задачи «${task.title}»`,{taskId:task.id});
  }else{
    logActivity(`Отклик команды «${proposal.team}» отклонён`,{taskId:task.id});
  }
  saveState();
  renderResponses();
  renderNav();
  showToast(decision==='accepted'?'Команда выбрана. Баллы будут начислены после подтверждения этапов':'Отклик отклонён');
}

function renderProjects(team=null){
  const projects=state.projects.filter(project=>!team||project.teamName===team||project.teamId===team);
  const title=team?'Проекты команды':'Активные проекты';
  const subtitle=team?'Следите за этапами, решениями бизнеса и подтверждёнными баллами.':'Подтверждайте фактический прогресс. Выбор команды сам по себе не приносит баллы.';
  app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">Проектный прогресс</p><h1 class="page-title medium">${title}</h1><p class="page-subtitle">${subtitle}</p></div>${team?`<div class="team-score"><span>${teamScore(team)}</span> баллов ${escapeHtml(team)}</div>`:''}</header><div class="project-grid">${projects.length?projects.map(renderProjectCard).join(''):emptyState('Проектов пока нет',team?'После выбора вашей команды бизнесом здесь появится проект.':'Примите подходящий отклик, чтобы начать проект с нулевым балансом.')}</div></section>`;
}

function renderProjectCard(project){
  const task=state.tasks.find(item=>item.id===project.taskId);
  const nextStage=nextProjectStage(project);
  const completed=project.stages.filter(stage=>stage.id!=='selected'&&stage.status==='confirmed').length;
  const percent=Math.round(completed/(STAGES.length-1)*100);
  return `<article class="project-card"><div class="project-card-top"><div><p class="eyebrow muted">${escapeHtml(project.teamName||project.teamId)}</p><h3>${escapeHtml(task?.title||'Задача')}</h3></div><div class="project-points"><strong>${calculateTeamPoints(project)}</strong><span>баллов</span></div></div><p class="project-next">${nextStage?`Текущий этап: <b>${escapeHtml(nextStage.label)}</b>`:'Все этапы подтверждены'}</p><div class="project-progress"><span style="width:${percent}%"></span></div><div class="project-card-footer"><span>${completed} из ${STAGES.length-1} рабочих этапов</span><button class="primary-button" data-open-project="${project.id}">Открыть проект</button></div></article>`;
}

function renderProjectDetail(projectId){
  const project=projectForId(projectId);
  if(!project){ renderProjects(role==='student'?'NOVA Lab':null); return; }
  if(role==='student'&&project.teamName!=='NOVA Lab'&&project.teamId!=='NOVA Lab'){ renderProjects('NOVA Lab'); return; }
  const task=state.tasks.find(item=>item.id===project.taskId);
  const proposal=state.proposals.find(item=>item.id===project.proposalId);
  const timeline=getProjectTimeline(project);
  const nextStage=nextProjectStage(project);
  const points=calculateTeamPoints(project);
  const completed=project.stages.filter(stage=>stage.id!=='selected'&&stage.status==='confirmed').length;
  const percent=Math.round(completed/(STAGES.length-1)*100);
  const actionPanel=role==='business'&&nextStage
    ? `<section class="project-action-panel"><p class="eyebrow light">Решение бизнеса</p><h2>${escapeHtml(nextStage.label)}</h2><p>Подтвердите только фактически выполненный этап. Повторное подтверждение не начислит баллы ещё раз.</p><label for="stage-reason">Причина отклонения</label><textarea id="stage-reason" rows="3" placeholder="Обязательно при отклонении"></textarea><div class="project-action-buttons"><button class="primary-button acid-button" data-confirm-stage="${nextStage.id}" data-project-id="${project.id}">Подтвердить этап · +${nextStage.points}</button><button class="danger-button" data-reject-stage="${nextStage.id}" data-project-id="${project.id}">Отклонить</button></div></section>`
    : `<section class="project-action-panel"><p class="eyebrow light">${project.status==='completed'?'Проект завершён':'Решение бизнеса'}</p><h2>${project.status==='completed'?'Все этапы подтверждены':'Ожидается подтверждение'}</h2><p>${role==='student'?'Команда видит прогресс, но не может подтверждать этапы самостоятельно.':'Дополнительных действий сейчас не требуется.'}</p></section>`;

  app.innerHTML=`<section class="page narrow"><button class="text-button project-back" data-back-projects>← Все проекты</button><header class="project-hero"><div><p class="eyebrow">${escapeHtml(project.teamName||project.teamId)} / ${escapeHtml(task?.company||'Бизнес')}</p><h1 class="page-title medium">${escapeHtml(task?.title||'Проект')}</h1><p class="page-subtitle">${escapeHtml(proposal?.idea||'Команда выбрана для выполнения задачи.')}</p></div><div class="project-total"><strong>${points}</strong><span>подтверждённых баллов</span></div></header><div class="project-detail-grid"><section><div class="project-summary"><div><span>Текущий этап</span><strong>${escapeHtml(nextStage?.label||'Проект завершён')}</strong></div><div><span>Прогресс</span><strong>${completed}/${STAGES.length-1}</strong></div></div><div class="project-progress large"><span style="width:${percent}%"></span></div><div class="timeline">${timeline.map(renderTimelineStage).join('')}</div></section>${actionPanel}</div></section>`;
}

function renderTimelineStage(stage){
  const event=stage.events.at(-1);
  const statusClass=stage.status==='confirmed'?'confirmed':stage.status==='rejected'?'rejected':'pending';
  const meta=event?`${formatEventDate(event.occurredAt)} · ${escapeHtml(event.actorId)}`:'Действий пока нет';
  return `<article class="timeline-stage ${statusClass}"><div class="timeline-marker">${stage.order+1}</div><div><div class="timeline-title"><h3>${escapeHtml(stage.label)}</h3><span class="status-pill ${statusClass}">${stageStatusLabel(stage.status)}</span></div><p>${meta}</p>${stage.rejectionReason?`<div class="rejection-note"><b>Причина:</b> ${escapeHtml(stage.rejectionReason)}</div>`:''}</div><strong class="timeline-points">${stage.points?`+${stage.points}`:'0'}</strong></article>`;
}

function formatEventDate(value){
  if(!value)return'Дата не указана';
  return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}

function confirmProjectStage(projectId,stageId){
  if(role!=='business')return;
  const index=state.projects.findIndex(project=>project.id===projectId);
  if(index<0)return;
  try{
    const previous=state.projects[index];
    state.projects[index]=confirmStage(previous,stageId,'business-demo');
    const project=state.projects[index];
    const task=state.tasks.find(item=>item.id===project.taskId);
    if(task&&task.status!=='archived'){
      task.status=state.projects.filter(item=>item.taskId===task.id).every(item=>item.status==='completed')?'completed':'in_progress';
      task.acceptingResponses=false;
    }
    if(previous.stages.find(stage=>stage.id===stageId)?.status!=='confirmed'){
      const stage=project.stages.find(item=>item.id===stageId);
      logActivity(`Этап «${stage.label}» команды «${project.teamName||project.teamId}» подтверждён: +${stage.points} баллов`,{taskId:project.taskId});
    }
    saveState();
    renderProjectDetail(projectId);
    renderNav();
    showToast('Этап подтверждён. Баллы начислены один раз');
  }catch(error){ showToast(error.message||'Не удалось подтвердить этап'); }
}

function rejectProjectStage(projectId,stageId){
  if(role!=='business')return;
  const index=state.projects.findIndex(project=>project.id===projectId);
  if(index<0)return;
  const reason=document.querySelector('#stage-reason')?.value.trim()||'';
  if(!reason){ showToast('Укажите причину отклонения этапа'); document.querySelector('#stage-reason')?.focus(); return; }
  try{
    const previous=state.projects[index];
    state.projects[index]=rejectStage(previous,stageId,reason);
    const project=state.projects[index];
    if(project.history.length!==previous.history.length){
      const stage=project.stages.find(item=>item.id===stageId);
      logActivity(`Этап «${stage.label}» команды «${project.teamName||project.teamId}» отклонён: ${reason}`,{taskId:project.taskId});
    }
    saveState();
    renderProjectDetail(projectId);
    renderNav();
    showToast('Этап отклонён без начисления баллов');
  }catch(error){ showToast(error.message||'Не удалось отклонить этап'); }
}

function renderCatalog(){
  const ranked=state.tasks.filter(isVisibleToStudents).map(task=>({...task,score:scoreTask(task).total})).sort((a,b)=>b.score-a.score||b.createdAt-a.createdAt);
  const themes=[...new Set(ranked.map(task=>task.theme).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
  if(catalogFilter.startsWith('theme:')&&!themes.includes(catalogFilter.slice(6)))catalogFilter='all';
  const filters=[['all','Все темы'],['ready','70+ готовые'],...themes.map(theme=>[`theme:${theme}`,theme])];
  const filtered=ranked.filter(task=>(catalogFilter==='all'||(catalogFilter==='ready'?task.score>=70:catalogFilter.startsWith('theme:')&&task.theme===catalogFilter.slice(6)))&&(`${task.title} ${task.company} ${task.theme}`.toLowerCase().includes(searchQuery.toLowerCase())));
  app.innerHTML=`<section class="page"><header class="page-head"><div><p class="eyebrow">Открытый каталог</p><h1 class="page-title">Выберите задачу, в которой хотите разобраться</h1><p class="page-subtitle">Фильтры формируются по темам опубликованных бизнес-задач, поэтому каталог всегда соответствует реальным направлениям.</p></div><div class="team-score"><span>${teamScore('NOVA Lab')}</span> баллов NOVA Lab</div></header><div class="catalog-toolbar"><input class="search-input" id="catalog-search" type="search" placeholder="Поиск по задаче, компании или теме" value="${escapeHtml(searchQuery)}"/><div class="filter-group">${filters.map(([id,label])=>`<button class="filter-button ${catalogFilter===id?'active':''}" data-filter="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join('')}</div></div><div class="task-grid">${filtered.length?filtered.map(renderTaskCard).join(''):emptyState('Ничего не найдено','Попробуйте изменить запрос или открыть все темы.')}</div></section>`;
  document.querySelector('#catalog-search').addEventListener('input',event=>{ searchQuery=event.target.value; renderCatalog(); const input=document.querySelector('#catalog-search'); input.focus(); input.setSelectionRange(input.value.length,input.value.length); });
}
function renderTaskCard(task){ const recommended=/ux|data/i.test(task.theme); const count=activeProposals(task.id).length; const status=taskStatus(task); return `<article class="task-card"><div class="task-card-head"><div class="task-statuses">${recommended?'<span class="badge recommended">Подходит вам</span>':''}<span class="status-pill ${status.className}">${status.label}</span></div><div class="score-chip">${task.score}</div></div><p class="task-company">${escapeHtml(task.company)}</p><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.context)}</p><div class="task-meta"><span class="meta-chip">${escapeHtml(task.theme)}</span><span class="meta-chip">до ${formatDate(task.deadline)}</span></div><div class="card-footer"><span>${count} откликов</span><button class="text-button task-action icon-action-button" data-open-task="${task.id}" aria-label="Открыть" title="Открыть">${actionIcons.open}</button></div></article>`; }
function openTask(id){ const task=state.tasks.find(item=>item.id===id); if(!task)return; if(role==='student'&&!isVisibleToStudents(task)){ showToast('Задача находится в архиве и недоступна студентам'); return; } const scored=scoreTask(task); const level=readiness(scored.total); const status=taskStatus(task); const existing=findTeamProposal(task.id); let studentAction=''; if(existing?.status==='pending')studentAction=canAcceptResponses(task)?`<button class="primary-button" data-edit-proposal="${existing.id}">Редактировать отклик</button>`:'<button class="primary-button" disabled>Приём закрыт</button>'; else if(existing)studentAction=`<p class="response-state">Ваш отклик: <b>${{accepted:'принят',declined:'отклонён'}[existing.status]||existing.status}</b></p>`; else if(canAcceptResponses(task))studentAction=`<button class="primary-button" data-apply="${task.id}">Предложить решение</button>`; else studentAction='<button class="primary-button" disabled>Отклики не принимаются</button>'; const lifecycle=task.status==='published'?`<button class="secondary-button small-button" data-toggle-accepting="${task.id}">${canAcceptResponses(task)?'Закрыть приём':'Открыть приём'}</button>`:task.status==='in_progress'?`<button class="primary-button small-button" data-task-status="completed" data-task-id="${task.id}">Завершить</button>`:task.status==='completed'?`<button class="secondary-button small-button" data-task-status="in_progress" data-task-id="${task.id}">Вернуть в работу</button>`:''; document.querySelector('#task-dialog-content').innerHTML=`<header class="dialog-header"><div><p class="eyebrow">${escapeHtml(task.company)} / ${escapeHtml(task.theme)}</p><h2 id="task-dialog-title">${escapeHtml(task.title)}</h2></div><button class="close-button" type="button" data-close-dialog="task-dialog" aria-label="Закрыть">×</button></header><div class="task-detail-grid"><div class="task-detail-copy"><h3>Контекст</h3><p>${escapeHtml(task.context)}</p><h3>Для кого</h3><p>${escapeHtml(task.users)||'Нужно уточнить'}</p><h3>Данные и материалы</h3><p>${escapeHtml(task.data)||'Нужно уточнить'}</p><h3>Ожидаемый результат</h3><p>${escapeHtml(task.outcome)||'Нужно уточнить'}</p><h3>Критерии успеха</h3><p>${escapeHtml(task.criteria)||'Нужно уточнить'}</p><h3>Ограничения</h3><p>${escapeHtml(task.constraints)||'Не указаны'}</p><h3>Связь с бизнесом</h3><p>${escapeHtml(task.contact)||'Нужно уточнить'}</p></div><aside class="detail-aside"><p class="eyebrow light">Рейтинг готовности</p><div class="score-big"><strong>${scored.total}</strong><span>/100</span></div><div class="task-statuses"><span class="status-pill ${level.className}">${level.label}</span><span class="status-pill ${status.className}">${status.label}</span></div><p>${level.copy}</p><p><b>Срок:</b><br>${formatDate(task.deadline)}</p>${role==='student'?studentAction:`<div class="detail-actions">${lifecycle}<button class="secondary-button task-action icon-action-button" data-edit-task="${task.id}" aria-label="Редактировать" title="Редактировать">${actionIcons.edit}</button>${task.status==='archived'?`<button class="secondary-button task-action icon-action-button" data-restore-task="${task.id}" aria-label="Восстановить" title="Восстановить">${actionIcons.restore}</button>`:`<button class="danger-button task-action icon-action-button" data-archive-task="${task.id}" aria-label="Архивировать" title="Архивировать">${actionIcons.archive}</button>`}</div>`}</aside></div>`; taskDialog.showModal(); document.body.classList.add('dialog-open'); }
function openProposal(id,proposalId=null){ const task=state.tasks.find(item=>item.id===id); const proposal=proposalId?state.proposals.find(item=>item.id===proposalId):null; if(!task||!canAcceptResponses(task)){ showToast('Приём откликов на эту задачу закрыт'); return; } if(proposalId&&(!proposal||proposal.status!=='pending')){ showToast('Можно редактировать только отклик на рассмотрении'); return; } if(!proposal&&findTeamProposal(id)){ showToast('У вашей команды уже есть отклик на эту задачу'); return; } if(taskDialog.open)taskDialog.close(); const form=document.querySelector('#proposal-form'); form.reset(); form.elements.taskId.value=id; form.elements.proposalId.value=proposal?.id||''; form.elements.team.value=proposal?.team||CURRENT_TEAM; form.elements.team.readOnly=Boolean(proposal); form.elements.idea.value=proposal?.idea||''; form.elements.plan.value=proposal?.plan||''; form.elements.timeline.value=proposal?.timeline||''; form.elements.link.value=proposal?.link||''; document.querySelector('#proposal-title').textContent=proposal?'Редактировать отклик':'Предложить решение'; document.querySelector('#proposal-submit').innerHTML=proposal?'Сохранить изменения <span>↗</span>':'Отправить отклик <span>↗</span>'; proposalDialog.showModal(); document.body.classList.add('dialog-open'); }
function saveTeamProposal(input,proposalId=''){
  const fields=Object.fromEntries(['taskId','team','idea','plan','timeline','link'].map(key=>[key,typeof input?.[key]==='string'?input[key].trim():'']));
  if(!fields.team||!fields.idea||!fields.plan||!fields.timeline)throw new Error('Заполните команду, идею, план и срок');
  const task=state.tasks.find(item=>item.id===fields.taskId);
  if(!task||!canAcceptResponses(task))throw new Error('Приём откликов на эту задачу закрыт');
  const existing=proposalId?state.proposals.find(item=>item.id===proposalId):null;
  if(proposalId&&(!existing||existing.taskId!==task.id||existing.status!=='pending'||existing.team.trim().toLowerCase()!==fields.team.toLowerCase())){
    throw new Error('Этот отклик уже нельзя изменить');
  }
  const duplicate=state.proposals.find(item=>item.taskId===task.id&&item.id!==proposalId&&item.status!=='withdrawn'&&item.team.trim().toLowerCase()===fields.team.toLowerCase());
  if(duplicate)throw new Error('Эта команда уже откликнулась на задачу');
  if(existing){
    Object.assign(existing,fields,{updatedAt:Date.now()});
  }else{
    if(!Object.hasOwn(state.teamPoints,fields.team))state.teamPoints[fields.team]=0;
    state.proposals.push({...fields,id:`p-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,status:'pending',points:teamScore(fields.team),createdAt:Date.now()});
  }
  const proposal=existing||state.proposals.at(-1);
  logActivity(`Команда «${proposal.team}» ${existing?'обновила':'отправила'} отклик на задачу «${task.title}»`,{taskId:task.id,actor:'student'});
  saveState();
  return proposal;
}
document.querySelector('#proposal-form').addEventListener('submit',event=>{
  event.preventDefault();
  const fields=Object.fromEntries(new FormData(event.currentTarget).entries());
  try{
    saveTeamProposal(fields,fields.proposalId);
    proposalDialog.close();
    document.body.classList.remove('dialog-open');
    event.currentTarget.reset();
    event.currentTarget.elements.team.readOnly=false;
    render();
    showToast(fields.proposalId?'Изменения отклика сохранены':'Отклик отправлен. Решение остаётся за бизнесом');
  }catch(error){ showToast(error.message); }
});
function withdrawProposal(id){ const proposal=state.proposals.find(item=>item.id===id); if(!proposal||proposal.status!=='pending')return; if(!window.confirm('Отозвать отклик? Бизнес больше не сможет его принять.'))return; proposal.status='withdrawn'; proposal.withdrawnAt=Date.now(); const task=state.tasks.find(item=>item.id===proposal.taskId); logActivity(`Команда «${proposal.team}» отозвала отклик на задачу «${task?.title||'Задача'}»`,{taskId:proposal.taskId}); saveState(); renderMyResponses(); renderNav(); showToast('Отклик отозван'); }
function renderMyResponses(){ const mine=state.proposals.filter(p=>p.team===CURRENT_TEAM); const labels={pending:'На рассмотрении',accepted:'Команда выбрана',declined:'Отклонён',withdrawn:'Отозван'}; app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">${CURRENT_TEAM} / ${teamScore(CURRENT_TEAM)} баллов</p><h1 class="page-title medium">Мои отклики</h1><p class="page-subtitle">Отклик на рассмотрении можно изменить или отозвать. На одну задачу у команды может быть только один активный отклик.</p></div><button class="primary-button" data-view="catalog">Найти задачу</button></header><div class="list-stack">${mine.length?mine.map(p=>{ const task=state.tasks.find(t=>t.id===p.taskId); const project=projectForProposal(p.id); const statusClass={accepted:'ready',pending:'working',declined:'draft',withdrawn:'closed'}[p.status]; return `<article class="list-card ${p.status==='withdrawn'?'is-muted':''}"><div class="mini-score">${scoreTask(task||{}).total}</div><div><span class="status-pill ${statusClass}">${labels[p.status]||p.status}</span><h3>${escapeHtml(task?.title||'Задача')}</h3><p>${escapeHtml(p.idea)}</p></div><div class="list-actions">${p.status==='pending'?`<button class="secondary-button small-button" data-edit-proposal="${p.id}">Редактировать</button><button class="danger-button small-button" data-withdraw-proposal="${p.id}">Отозвать</button>`:''}<button class="secondary-button small-button" data-open-task="${p.taskId}">Карточка задачи</button>${project?`<button class="primary-button small-button" data-open-project="${project.id}">Открыть проект</button>`:''} </div></article>`; }).join(''):emptyState('У команды ещё нет откликов','Откройте каталог, выберите интересную задачу и предложите решение.')}</div></section>`; }

function renderActivity(){ const items=state.activity.filter(item=>(item.audience||[]).includes(role)); app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">Уведомления и история</p><h1 class="page-title medium">События проекта</h1><p class="page-subtitle">Все важные изменения задач и откликов сохраняются локально и остаются после перезагрузки.</p></div></header><div class="activity-list">${items.length?items.map(item=>`<article class="activity-item"><span class="activity-dot" aria-hidden="true"></span><div><h3>${escapeHtml(item.message)}</h3><p>${new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(item.createdAt))}</p></div>${item.taskId?`<button class="secondary-button small-button" data-open-task="${item.taskId}">Открыть</button>`:''}</article>`).join(''):emptyState('Событий пока нет','Здесь появятся публикации, отклики, решения и изменения статусов.')}</div></section>`; let changed=false; items.forEach(item=>{ item.readBy=item.readBy||[]; if(!item.readBy.includes(role)){ item.readBy.push(role); changed=true; } }); if(changed){ saveState(); renderNav(); } }

document.addEventListener('click',event=>{
  const viewButton=event.target.closest('[data-view]'); if(viewButton){ event.preventDefault(); setView(viewButton.dataset.view); return; }
  const allResponsesButton=event.target.closest('[data-all-responses]'); if(allResponsesButton){ responseTaskFilter=null; renderResponses(); return; }
  const newTaskButton=event.target.closest('[data-new-task]'); if(newTaskButton){ openNewTaskBuilder(); return; }
  const taskListButton=event.target.closest('[data-task-list-mode]'); if(taskListButton){ taskListMode=taskListButton.dataset.taskListMode; renderBusinessTasks(); return; }
  const roleButton=event.target.closest('[data-role]'); if(roleButton){ role=roleButton.dataset.role; responseTaskFilter=null; currentView=role==='business'?'builder':'catalog'; render(); return; }
  const editButton=event.target.closest('[data-edit-task]'); if(editButton){ startEditingTask(editButton.dataset.editTask); return; }
  const archiveButton=event.target.closest('[data-archive-task]'); if(archiveButton){ openArchiveConfirmation(archiveButton.dataset.archiveTask); return; }
  const restoreButton=event.target.closest('[data-restore-task]'); if(restoreButton){ setTaskArchived(restoreButton.dataset.restoreTask,false); return; }
  const confirmArchiveButton=event.target.closest('#confirm-archive'); if(confirmArchiveButton&&pendingArchiveTaskId){ setTaskArchived(pendingArchiveTaskId,true); return; }
  const acceptingButton=event.target.closest('[data-toggle-accepting]'); if(acceptingButton){ toggleAcceptingResponses(acceptingButton.dataset.toggleAccepting); return; }
  const statusButton=event.target.closest('[data-task-status]'); if(statusButton){ setTaskStatus(statusButton.dataset.taskId,statusButton.dataset.taskStatus); return; }
  const taskButton=event.target.closest('[data-open-task]'); if(taskButton){ openTask(taskButton.dataset.openTask); return; }
  const responseButton=event.target.closest('[data-task-responses]'); if(responseButton){ currentView='responses'; responseTaskFilter=responseButton.dataset.taskResponses; renderNav(); renderResponses(); return; }
  const decisionButton=event.target.closest('[data-decision]'); if(decisionButton){ updateDecision(decisionButton.dataset.proposal,decisionButton.dataset.decision); return; }
  const projectButton=event.target.closest('[data-open-project]'); if(projectButton){ activeProjectId=projectButton.dataset.openProject; currentView='project-detail'; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  const backProjectsButton=event.target.closest('[data-back-projects]'); if(backProjectsButton){ currentView=role==='business'?'projects':'my-projects'; render(); return; }
  const confirmStageButton=event.target.closest('[data-confirm-stage]'); if(confirmStageButton){ confirmProjectStage(confirmStageButton.dataset.projectId,confirmStageButton.dataset.confirmStage); return; }
  const rejectStageButton=event.target.closest('[data-reject-stage]'); if(rejectStageButton){ rejectProjectStage(rejectStageButton.dataset.projectId,rejectStageButton.dataset.rejectStage); return; }
  const filterButton=event.target.closest('[data-filter]'); if(filterButton){ catalogFilter=filterButton.dataset.filter; renderCatalog(); return; }
  const applyButton=event.target.closest('[data-apply]'); if(applyButton){ openProposal(applyButton.dataset.apply); return; }
  const editProposalButton=event.target.closest('[data-edit-proposal]'); if(editProposalButton){ const proposal=state.proposals.find(item=>item.id===editProposalButton.dataset.editProposal); if(proposal)openProposal(proposal.taskId,proposal.id); return; }
  const withdrawButton=event.target.closest('[data-withdraw-proposal]'); if(withdrawButton){ withdrawProposal(withdrawButton.dataset.withdrawProposal); return; }
  const closeButton=event.target.closest('[data-close-dialog]'); if(closeButton){ document.querySelector(`#${closeButton.dataset.closeDialog}`).close(); document.body.classList.remove('dialog-open'); }
});
document.querySelector('#help-button').addEventListener('click',()=>{ document.querySelector('#help-dialog').showModal(); document.body.classList.add('dialog-open'); });
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>document.body.classList.toggle('dialog-open',Boolean(document.querySelector('dialog[open]')))));
archiveDialog.addEventListener('close',()=>{ pendingArchiveTaskId=null; });

function registerWebMcpTools(){ const context=document.modelContext; if(!context?.registerTool)return; const register=tool=>Promise.resolve(context.registerTool(tool)).catch(error=>console.warn('WebMCP',error)); register({name:'list_published_tasks',title:'Показать задачи',description:'Возвращает опубликованные бизнес-задачи, отсортированные по рейтингу готовности.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return state.tasks.filter(isPublished).map(t=>({id:t.id,title:t.title,company:t.company,readiness:scoreTask(t).total})).sort((a,b)=>b.readiness-a.readiness);}}); register({name:'create_task_draft',title:'Создать черновик задачи',description:'Создаёт и открывает редактируемый черновик бизнес-задачи. Ничего не публикует.',inputSchema:{type:'object',properties:{title:{type:'string'},context:{type:'string'},company:{type:'string'}},required:['title','context'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input?.title?.trim()||!input?.context?.trim())throw new Error('Нужны title и context');state.editingTaskId=null;state.draft={...blankDraft,title:input.title.trim(),context:input.context.trim(),company:(input.company||'Моя компания').trim()};saveState();role='business';currentView='builder';render();return{status:'draft_created',readiness:scoreTask(state.draft).total};}}); register({name:'submit_team_proposal',title:'Отправить отклик команды',description:'Отправляет отклик на существующую задачу и обновляет список откликов.',inputSchema:{type:'object',properties:{taskId:{type:'string'},team:{type:'string'},idea:{type:'string'},plan:{type:'string'},timeline:{type:'string'}},required:['taskId','team','idea','plan','timeline'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){const proposal=saveTeamProposal(input);render();return{status:'submitted',proposalId:proposal.id};}}); }

render();
registerWebMcpTools();
