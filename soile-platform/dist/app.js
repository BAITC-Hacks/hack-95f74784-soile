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
const scoreFields = [ ['context','Контекст и потребность',20,36], ['data','Данные и материалы',20,22], ['outcome','Ожидаемый результат',15,16], ['criteria','Критерии успеха',15,16], ['constraints','Ограничения',10,12], ['users','Пользователи',10,12], ['contact','Связь с бизнесом',10,10] ];

function initialState(){ return { tasks:seedTasks, proposals:seedProposals, draft:{...blankDraft}, teamPoints:{'NOVA Lab':780,'Data Nomads':640,'Kórme':520,'Pixel Crew':410} }; }
function loadState(){ try { const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(parsed?.tasks&&parsed?.proposals&&parsed?.draft) return parsed; } catch(error){ console.warn('Не удалось загрузить данные',error); } return initialState(); }

let state=loadState();
let role='business';
let currentView='builder';
let catalogFilter='all';
let searchQuery='';
const app=document.querySelector('#app');
const nav=document.querySelector('#main-nav');
const toast=document.querySelector('#toast');
const aiDialog=document.querySelector('#ai-dialog');
const taskDialog=document.querySelector('#task-dialog');
const proposalDialog=document.querySelector('#proposal-dialog');
const archiveDialog=document.querySelector('#archive-dialog');

function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function scoreTask(task){ const items=scoreFields.map(([key,label,weight,min])=>{ const text=(task[key]||'').trim(); const earned=text.length>=min?weight:0; return {key,label,weight,earned}; }); return {total:items.reduce((sum,item)=>sum+item.earned,0),items}; }
function readiness(score){ if(score>=90)return{label:'Приоритетная',className:'priority',copy:'Полностью готова к работе и выделяется в каталоге.'}; if(score>=70)return{label:'Готовая',className:'ready',copy:'Хорошо описана и получает повышенную позицию.'}; if(score>=40)return{label:'Рабочая',className:'working',copy:'Студенты могут откликаться; детали ещё можно усилить.'}; return{label:'Черновик',className:'draft',copy:'Видна в каталоге, но требует дополнительных уточнений.'}; }
function scoreLevel(scored){ return scored.verified?readiness(scored.total):{label:'Не проверен',className:'draft',copy:'Запустите AI-проверку: длина текста больше не влияет на рейтинг.'}; }
function showToast(message){ toast.textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2600); }
function formatDate(value){ if(!value)return'Срок не указан'; return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`)); }
function emptyState(title,text){ return `<div class="empty-state"><h3>${title}</h3><p>${text}</p></div>`; }
function isPublished(task){ return (task.status||'published')==='published'; }
function clearEditor(){ state.draft={...blankDraft}; state.editingTaskId=null; selectedAiFields.clear(); }
function startNewTask(){ clearEditor(); saveState(); setView('builder'); }
function editTask(id){
  const task=state.tasks.find(item=>item.id===id);
  if(!task)return;
  const {id:taskId,status,createdAt,...fields}=task;
  state.draft={...blankDraft,...fields};
  state.editingTaskId=taskId;
  selectedAiFields.clear();
  saveState();
  setView('builder');
}
function cancelEditing(){ clearEditor(); saveState(); setView('tasks'); showToast('Редактирование отменено'); }
function completeDemoAssessment(task){ return {signature:taskSignature(task),total:100,evaluations:scoreFields.map(([field,,max])=>({field,earned:max,max,reason:'Демо-поле содержит связные и конкретные сведения.',suggestion:''})),summary:'Демонстрационный пример полностью описывает задачу.',warnings:[],assessedAt:Date.now(),source:'demo'}; }
function fillDemoDraft(){ state.draft={...demoDraft}; state.draft.assessment=completeDemoAssessment(state.draft); state.editingTaskId=null; selectedAiFields.clear(); saveState(); renderBuilder(); showToast('Демо-пример заполнен — проверьте и измените любые поля'); }

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
  const scored=scoreTask(state.draft); const level=readiness(scored.total);
  app.innerHTML=`<section class="page"><header class="page-head"><div><p class="eyebrow">Новая задача / конструктор</p><h1 class="page-title">Сделайте задачу понятной — до первого отклика</h1><p class="page-subtitle">Опишите потребность своими словами. Рейтинг покажет, чего не хватает, а AI задаст вопросы, которые помогут улучшить карточку.</p></div></header>
  <div class="builder-layout"><section class="panel"><div class="panel-body"><div class="panel-topline"><span class="stage-pill">01 · Черновик</span>${state.draft.aiUsed?'<span class="badge ai">AI дополнение подтверждено</span>':'<span class="badge">Автосохранение</span>'}</div>
  <form id="builder-form" class="form-grid">
  <label><span>Компания</span><input name="company" value="${escapeHtml(state.draft.company)}" placeholder="Название компании" /></label>
  <label><span>Тема</span><select name="theme">${['UX / исследование','Data / аналитика','Маркетинг / продукт','Сервис / образование','Разработка / автоматизация'].map(x=>`<option ${state.draft.theme===x?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="full"><span>Название задачи</span><input name="title" value="${escapeHtml(state.draft.title)}" placeholder="Например: сократить время обработки обращений" /></label>
  <label class="full"><span>Контекст и потребность</span>${renderAiFieldControl('context','Контекст и потребность',`<textarea name="context" rows="4" placeholder="Что происходит сейчас и что необходимо изменить">${escapeHtml(state.draft.context)}</textarea>`,scored.verified)}<small class="form-hint">Опишите проблему, а не готовое решение.</small></label>
  <label><span>Для кого создаётся решение</span>${renderAiFieldControl('users','Для кого создаётся решение',`<input name="users" value="${escapeHtml(state.draft.users)}" placeholder="Пользователи или сотрудники" />`,scored.verified)}</label>
  <label><span>Срок</span><input name="deadline" type="date" value="${escapeHtml(state.draft.deadline)}" /></label>
  <label class="full"><span>Доступные данные и материалы</span><textarea name="data" rows="3" placeholder="Документы, интервью, выгрузки, примеры">${escapeHtml(state.draft.data)}</textarea></label>
  <label class="full"><span>Ожидаемый результат</span><textarea name="outcome" rows="3" placeholder="Что должна передать команда">${escapeHtml(state.draft.outcome)}</textarea></label>
  <label><span>Критерии успеха</span><textarea name="criteria" rows="3" placeholder="Как понять, что решение подходит">${escapeHtml(state.draft.criteria)}</textarea></label>
  <label><span>Ограничения</span><textarea name="constraints" rows="3" placeholder="Сроки, технологии, доступы">${escapeHtml(state.draft.constraints)}</textarea></label>
  <label class="full"><span>Связь с бизнесом</span><input name="contact" value="${escapeHtml(state.draft.contact)}" placeholder="Контакт, формат консультаций, срок ответа" /></label></form>
  <div class="form-actions"><button class="primary-button" id="ai-button" type="button">Уточнить с AI <span>↗</span></button><button class="secondary-button" id="publish-button" type="button">Опубликовать в каталог</button><button class="text-button" id="reset-button" type="button">Очистить</button></div></div></section>
  <aside class="panel score-panel"><div class="panel-body"><p class="eyebrow light">Рейтинг готовности</p><div class="score-big"><strong id="score-value">${scored.total}</strong><span>/100</span></div><span id="score-status" class="status-pill ${level.className}">${level.label}</span><p class="score-copy" id="score-copy">${level.copy}</p><div class="progress" aria-label="${scored.total} процентов готовности"><span id="score-progress" style="width:${scored.total}%"></span></div><ul class="score-list" id="score-list">${renderScoreItems(scored.items)}</ul><div class="score-foot">Низкий рейтинг не скрывает задачу. Баллы начисляются только за заполненные и подтверждённые сведения.</div></div></aside></div></section>`;
  document.querySelector('#builder-form').addEventListener('input',event=>{ if(!event.target.name)return; state.draft[event.target.name]=event.target.value; state.draft.aiUsed=false; saveState(); updateBuilderScore(); });
  document.querySelector('#ai-button').addEventListener('click',openAiQuestions);
  document.querySelector('#publish-button').addEventListener('click',publishDraft);
  document.querySelector('#reset-button').addEventListener('click',()=>{ state.draft={...blankDraft}; saveState(); renderBuilder(); showToast('Черновик очищен'); });
}

function renderScoreItems(items){ return items.map(item=>`<li class="${item.earned===item.weight?'complete':''}"><span>${item.label}</span><b>${item.earned}/${item.weight}</b></li>`).join(''); }
function updateBuilderScore(){ const scored=scoreTask(state.draft); const level=readiness(scored.total); document.querySelector('#score-value').textContent=scored.total; document.querySelector('#score-status').textContent=level.label; document.querySelector('#score-status').className=`status-pill ${level.className}`; document.querySelector('#score-copy').textContent=level.copy; document.querySelector('#score-progress').style.width=`${scored.total}%`; document.querySelector('#score-list').innerHTML=renderScoreItems(scored.items); }
function openAiQuestions(){ const questions=[{key:'ai-result',label:state.draft.outcome?'Как проверить, что указанный результат действительно полезен?':'Какой конкретный результат должна передать команда?',value:state.draft.outcome},{key:'ai-evidence',label:state.draft.data?'Какие из этих материалов команда получит в первый день?':'Какие данные, материалы или примеры уже доступны?',value:state.draft.data},{key:'ai-success',label:'По каким измеримым признакам бизнес примет решение?',value:state.draft.criteria},{key:'ai-boundaries',label:'Какие сроки, технологии или доступы ограничивают решение?',value:state.draft.constraints}]; document.querySelector('#ai-questions').innerHTML=questions.map((q,i)=>`<label><span>${i+1}. ${q.label}</span><textarea id="${q.key}" rows="2" required>${escapeHtml(q.value)}</textarea></label>`).join(''); aiDialog.showModal(); document.body.classList.add('dialog-open'); }
document.querySelector('#ai-form').addEventListener('submit',event=>{ event.preventDefault(); const result=document.querySelector('#ai-result').value.trim(); const evidence=document.querySelector('#ai-evidence').value.trim(); const success=document.querySelector('#ai-success').value.trim(); const boundaries=document.querySelector('#ai-boundaries').value.trim(); if(!result||!evidence||!success||!boundaries){ showToast('Ответьте на все вопросы — AI не будет додумывать факты'); return; } state.draft.outcome=result; state.draft.data=evidence; state.draft.criteria=success; state.draft.constraints=boundaries; state.draft.aiUsed=true; saveState(); aiDialog.close(); document.body.classList.remove('dialog-open'); renderBuilder(); showToast('Карточка дополнена. Проверьте формулировки перед публикацией'); });
function publishDraft(){ if(!state.draft.title.trim()||!state.draft.context.trim()){ showToast('Добавьте название и контекст задачи'); return; } state.tasks.push({...state.draft,id:`task-${Date.now()}`,status:'published',createdAt:Date.now()}); state.draft={...blankDraft}; saveState(); setView('tasks'); showToast('Задача опубликована в общем каталоге'); }

function renderBusinessTasks(){
  const tasks=[...state.tasks].reverse(); const avg=tasks.length?Math.round(tasks.reduce((s,t)=>s+scoreTask(t).total,0)/tasks.length):0;
  app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">Рабочий стол бизнеса</p><h1 class="page-title medium">Ваши задачи</h1><p class="page-subtitle">Рейтинг пересчитывается после каждого изменения. Отклики не назначают команду автоматически.</p></div><button class="primary-button" data-view="builder">Новая задача <span>＋</span></button></header>
  <div class="stats-row"><div class="stat-card"><strong>${tasks.length}</strong><span>задач в каталоге</span></div><div class="stat-card"><strong>${avg}</strong><span>средний рейтинг</span></div><div class="stat-card"><strong>${state.proposals.filter(p=>p.status==='pending').length}</strong><span>новых откликов</span></div><div class="stat-card"><strong>${state.proposals.filter(p=>p.status==='accepted').length}</strong><span>команд выбрано</span></div></div>
  <div class="list-stack">${tasks.map(task=>{ const score=scoreTask(task).total; const level=readiness(score); const count=state.proposals.filter(p=>p.taskId===task.id).length; return `<article class="list-card"><div class="mini-score">${score}</div><div><span class="status-pill ${level.className}">${level.label}</span><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.company)} · ${escapeHtml(task.theme)} · ${formatDate(task.deadline)}</p></div><div class="list-actions"><button class="secondary-button" data-open-task="${task.id}">Открыть</button><button class="primary-button" data-task-responses="${task.id}">${count} откликов</button></div></article>`; }).join('')}</div></section>`;
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

function renderCatalog(){ const ranked=[...state.tasks].map(task=>({...task,score:scoreTask(task).total})).sort((a,b)=>b.score-a.score||b.createdAt-a.createdAt); const filtered=ranked.filter(task=>(catalogFilter==='all'||(catalogFilter==='ready'?task.score>=70:task.theme.toLowerCase().includes(catalogFilter)))&&(`${task.title} ${task.company} ${task.theme}`.toLowerCase().includes(searchQuery.toLowerCase()))); app.innerHTML=`<section class="page"><header class="page-head"><div><p class="eyebrow">Открытый каталог</p><h1 class="page-title">Выберите задачу, в которой хотите разобраться</h1><p class="page-subtitle">Все задачи доступны всем командам. Рекомендации помогают ориентироваться, но ничего не скрывают.</p></div><div class="team-score"><span>${state.teamPoints['NOVA Lab']||0}</span> баллов NOVA Lab</div></header><div class="catalog-toolbar"><input class="search-input" id="catalog-search" type="search" placeholder="Поиск по задаче, компании или теме" value="${escapeHtml(searchQuery)}"/><div class="filter-group">${[['all','Все'],['ready','70+ готовые'],['data','Data'],['ux','UX'],['маркетинг','Маркетинг']].map(([id,label])=>`<button class="filter-button ${catalogFilter===id?'active':''}" data-filter="${id}">${label}</button>`).join('')}</div></div><div class="task-grid">${filtered.length?filtered.map(renderTaskCard).join(''):emptyState('Ничего не найдено','Попробуйте изменить запрос или открыть все темы.')}</div></section>`; document.querySelector('#catalog-search').addEventListener('input',event=>{ searchQuery=event.target.value; renderCatalog(); const input=document.querySelector('#catalog-search'); input.focus(); input.setSelectionRange(input.value.length,input.value.length); }); }
function renderTaskCard(task){ const level=readiness(task.score); const recommended=/ux|data/i.test(task.theme); const count=state.proposals.filter(p=>p.taskId===task.id).length; return `<article class="task-card"><div class="task-card-head"><div>${recommended?'<span class="badge recommended">Подходит вам</span>':`<span class="status-pill ${level.className}">${level.label}</span>`}</div><div class="score-chip">${task.score}</div></div><p class="task-company">${escapeHtml(task.company)}</p><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.context)}</p><div class="task-meta"><span class="meta-chip">${escapeHtml(task.theme)}</span><span class="meta-chip">до ${formatDate(task.deadline)}</span></div><div class="card-footer"><span>${count} откликов</span><button class="text-button" data-open-task="${task.id}">Открыть →</button></div></article>`; }
function openTask(id){ const task=state.tasks.find(item=>item.id===id); if(!task)return; const scored=scoreTask(task); const level=readiness(scored.total); document.querySelector('#task-dialog-content').innerHTML=`<header class="dialog-header"><div><p class="eyebrow">${escapeHtml(task.company)} / ${escapeHtml(task.theme)}</p><h2 id="task-dialog-title">${escapeHtml(task.title)}</h2></div><button class="close-button" data-close-dialog="task-dialog" aria-label="Закрыть">×</button></header><div class="task-detail-grid"><div class="task-detail-copy"><h3>Контекст</h3><p>${escapeHtml(task.context)}</p><h3>Для кого</h3><p>${escapeHtml(task.users)||'Нужно уточнить'}</p><h3>Данные и материалы</h3><p>${escapeHtml(task.data)||'Нужно уточнить'}</p><h3>Ожидаемый результат</h3><p>${escapeHtml(task.outcome)||'Нужно уточнить'}</p><h3>Критерии успеха</h3><p>${escapeHtml(task.criteria)||'Нужно уточнить'}</p><h3>Ограничения</h3><p>${escapeHtml(task.constraints)||'Не указаны'}</p><h3>Связь с бизнесом</h3><p>${escapeHtml(task.contact)||'Нужно уточнить'}</p></div><aside class="detail-aside"><p class="eyebrow light">Рейтинг готовности</p><div class="score-big"><strong>${scored.total}</strong><span>/100</span></div><span class="status-pill ${level.className}">${level.label}</span><p>${level.copy}</p><p><b>Срок:</b><br>${formatDate(task.deadline)}</p>${role==='student'?`<button class="primary-button" data-apply="${task.id}">Предложить решение</button>`:''}</aside></div>`; taskDialog.showModal(); document.body.classList.add('dialog-open'); }
function openProposal(id){ taskDialog.close(); document.querySelector('#proposal-form [name="taskId"]').value=id; proposalDialog.showModal(); document.body.classList.add('dialog-open'); }
document.querySelector('#proposal-form').addEventListener('submit',event=>{ event.preventDefault(); const fields=Object.fromEntries(new FormData(event.currentTarget).entries()); if(!fields.team.trim()||!fields.idea.trim()||!fields.plan.trim()||!fields.timeline.trim()){ showToast('Заполните команду, идею, план и срок'); return; } state.proposals.push({...fields,id:`p-${Date.now()}`,status:'pending',points:state.teamPoints[fields.team]||300}); if(!state.teamPoints[fields.team])state.teamPoints[fields.team]=300; saveState(); proposalDialog.close(); document.body.classList.remove('dialog-open'); event.currentTarget.reset(); renderNav(); showToast('Отклик отправлен. Решение остаётся за бизнесом'); });
function renderMyResponses(){ const mine=state.proposals.filter(p=>p.team==='NOVA Lab'); app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">NOVA Lab / ${state.teamPoints['NOVA Lab']||0} баллов</p><h1 class="page-title medium">Мои отклики</h1><p class="page-subtitle">Баллы начисляются после подтверждённого этапа работы, а не за количество заявок.</p></div><button class="primary-button" data-view="catalog">Найти задачу</button></header><div class="list-stack">${mine.length?mine.map(p=>{ const task=state.tasks.find(t=>t.id===p.taskId); return `<article class="list-card"><div class="mini-score">${scoreTask(task||{}).total}</div><div><span class="status-pill ${p.status==='accepted'?'ready':p.status==='declined'?'draft':'working'}">${{pending:'На рассмотрении',accepted:'Команда выбрана',declined:'Отклонён'}[p.status]}</span><h3>${escapeHtml(task?.title||'Задача')}</h3><p>${escapeHtml(p.idea)}</p></div><div class="list-actions"><button class="secondary-button" data-open-task="${p.taskId}">Карточка задачи</button></div></article>`; }).join(''):emptyState('У команды ещё нет откликов','Откройте каталог, выберите интересную задачу и предложите решение.')}</div></section>`; }

document.addEventListener('click',event=>{ const viewButton=event.target.closest('[data-view]'); if(viewButton){ event.preventDefault(); setView(viewButton.dataset.view); return; } const roleButton=event.target.closest('[data-role]'); if(roleButton){ role=roleButton.dataset.role; currentView=role==='business'?'builder':'catalog'; render(); return; } const taskButton=event.target.closest('[data-open-task]'); if(taskButton)openTask(taskButton.dataset.openTask); const responseButton=event.target.closest('[data-task-responses]'); if(responseButton){ currentView='responses'; renderNav(); renderResponses(responseButton.dataset.taskResponses); } const decisionButton=event.target.closest('[data-decision]'); if(decisionButton)updateDecision(decisionButton.dataset.proposal,decisionButton.dataset.decision); const filterButton=event.target.closest('[data-filter]'); if(filterButton){ catalogFilter=filterButton.dataset.filter; renderCatalog(); } const applyButton=event.target.closest('[data-apply]'); if(applyButton)openProposal(applyButton.dataset.apply); const closeButton=event.target.closest('[data-close-dialog]'); if(closeButton){ document.querySelector(`#${closeButton.dataset.closeDialog}`).close(); document.body.classList.remove('dialog-open'); } });
document.querySelector('#help-button').addEventListener('click',()=>{ document.querySelector('#help-dialog').showModal(); document.body.classList.add('dialog-open'); });
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open')));

function registerWebMcpTools(){ const context=document.modelContext; if(!context?.registerTool)return; const register=tool=>Promise.resolve(context.registerTool(tool)).catch(error=>console.warn('WebMCP',error)); register({name:'list_published_tasks',title:'Показать задачи',description:'Возвращает опубликованные бизнес-задачи, отсортированные по рейтингу готовности.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return state.tasks.map(t=>({id:t.id,title:t.title,company:t.company,readiness:scoreTask(t).total})).sort((a,b)=>b.readiness-a.readiness);}}); register({name:'create_task_draft',title:'Создать черновик задачи',description:'Создаёт и открывает редактируемый черновик бизнес-задачи. Ничего не публикует.',inputSchema:{type:'object',properties:{title:{type:'string'},context:{type:'string'},company:{type:'string'}},required:['title','context'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input?.title?.trim()||!input?.context?.trim())throw new Error('Нужны title и context');state.draft={...blankDraft,title:input.title.trim(),context:input.context.trim(),company:(input.company||'Моя компания').trim()};saveState();role='business';currentView='builder';render();return{status:'draft_created',readiness:scoreTask(state.draft).total};}}); register({name:'submit_team_proposal',title:'Отправить отклик команды',description:'Отправляет отклик на существующую задачу и обновляет список откликов.',inputSchema:{type:'object',properties:{taskId:{type:'string'},team:{type:'string'},idea:{type:'string'},plan:{type:'string'},timeline:{type:'string'}},required:['taskId','team','idea','plan','timeline'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!state.tasks.some(t=>t.id===input.taskId))throw new Error('Задача не найдена');const proposal={...input,id:`p-${Date.now()}`,status:'pending',points:state.teamPoints[input.team]||300};state.proposals.push(proposal);saveState();renderNav();return{status:'submitted',proposalId:proposal.id};}}); }

render();
registerWebMcpTools();
