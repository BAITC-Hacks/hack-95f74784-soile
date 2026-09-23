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
const demoDraft = { company:'Aspan Retail', title:'Сократить время обработки обращений покупателей', theme:'Сервис / образование', context:'Служба поддержки получает около 450 обращений в неделю. Ответы по типовым вопросам готовятся вручную, поэтому покупатели ждут до двух рабочих дней. Нужно изучить процесс и предложить способ ускорить первый содержательный ответ.', users:'Покупатели интернет-магазина и специалисты первой линии поддержки', data:'Обезличенная выгрузка 1 200 обращений за три месяца, справочник тем и шаблоны ответов', outcome:'Карта текущего процесса, приоритизированный список проблем и интерактивный прототип нового сценария обработки обращений', criteria:'Среднее время подготовки первого ответа в тестовом сценарии сокращается минимум на 30%; пять специалистов успешно проходят пользовательский тест', constraints:'Четыре недели; без доступа к персональным данным; решение должно работать в браузере без установки дополнительного ПО', contact:'Еженедельный созвон по четвергам; эксперт поддержки отвечает на вопросы в течение двух рабочих дней', deadline:'2026-11-30', aiUsed:false };
const scoreFields = [ ['context','Контекст и потребность',20], ['data','Данные и материалы',20], ['outcome','Ожидаемый результат',15], ['criteria','Критерии успеха',15], ['constraints','Ограничения',10], ['users','Пользователи',10], ['contact','Связь с бизнесом',10] ];
const signatureFields = ['company','title','theme','context','users','data','outcome','criteria','constraints','contact','deadline'];

function initialState(){ return { tasks:seedTasks, proposals:seedProposals, draft:{...blankDraft}, editingTaskId:null, teamPoints:{'NOVA Lab':780,'Data Nomads':640,'Kórme':520,'Pixel Crew':410} }; }
function normalizeState(saved){
  if(!saved?.tasks||!saved?.proposals||!saved?.draft)return null;
  const tasks=saved.tasks.map(task=>({...task,status:task.status||'published'}));
  const editingTaskId=tasks.some(task=>task.id===saved.editingTaskId)?saved.editingTaskId:null;
  return {...saved,tasks,draft:{...blankDraft,...saved.draft},editingTaskId,teamPoints:saved.teamPoints||{}};
}
function loadState(){ try { const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)); const normalized=normalizeState(parsed); if(normalized)return normalized; } catch(error){ console.warn('Не удалось загрузить данные',error); } return initialState(); }

let state=loadState();
let role='business';
let currentView='builder';
let catalogFilter='all';
let searchQuery='';
let pendingAiRefinement=null;
let pendingAiFields=[];
let pendingAiAssessment=null;
let selectedAiFields=new Set();
let aiRequestController=null;
const app=document.querySelector('#app');
const nav=document.querySelector('#main-nav');
const toast=document.querySelector('#toast');
const aiDialog=document.querySelector('#ai-dialog');
const taskDialog=document.querySelector('#task-dialog');
const proposalDialog=document.querySelector('#proposal-dialog');

function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function taskSignature(task){ return JSON.stringify(signatureFields.map(field=>String(task?.[field]||'').trim())); }
const seedSignatures=new Map(seedTasks.map(task=>[task.id,taskSignature(task)]));
function normalizeStoredAssessment(task){
  const assessment=task?.assessment;
  if(!assessment||assessment.signature!==taskSignature(task)||!Array.isArray(assessment.evaluations))return null;
  const byField=new Map(assessment.evaluations.map(item=>[item?.field,item]));
  if(byField.size!==scoreFields.length)return null;
  const items=[];
  for(const [key,label,weight] of scoreFields){
    const item=byField.get(key);
    if(!item||!Number.isInteger(item.earned)||item.earned<0||item.earned>weight)return null;
    items.push({key,label,weight,earned:item.earned,reason:String(item.reason||''),suggestion:String(item.suggestion||'')});
  }
  return {total:items.reduce((sum,item)=>sum+item.earned,0),items,verified:true,summary:String(assessment.summary||''),warnings:Array.isArray(assessment.warnings)?assessment.warnings:[]};
}
function scoreTask(task){
  const assessed=normalizeStoredAssessment(task);
  if(assessed)return assessed;
  if(task?.id&&seedSignatures.get(task.id)===taskSignature(task)){
    const items=scoreFields.map(([key,label,weight])=>({key,label,weight,earned:(task[key]||'').trim()?weight:0,reason:'Проверенный демонстрационный пример.',suggestion:''}));
    return {total:items.reduce((sum,item)=>sum+item.earned,0),items,verified:true,summary:'Проверенный демонстрационный пример.',warnings:[]};
  }
  return {total:0,items:scoreFields.map(([key,label,weight])=>({key,label,weight,earned:0,reason:'Ожидает проверки AI.',suggestion:''})),verified:false,summary:'',warnings:[]};
}
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

function renderNav(){ const business=[['builder','Конструктор'],['tasks','Мои задачи'],['responses',`Отклики · ${state.proposals.filter(p=>p.status==='pending').length}`]]; const student=[['catalog','Каталог'],['my-responses','Мои отклики']]; nav.innerHTML=(role==='business'?business:student).map(([id,label])=>`<button class="nav-button ${currentView===id?'active':''}" data-view="${id}">${label}</button>`).join(''); document.querySelectorAll('.role-button').forEach(button=>button.classList.toggle('active',button.dataset.role===role)); }
function setView(view){ currentView=view; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function render(){ renderNav(); if(currentView==='builder')renderBuilder(); if(currentView==='tasks')renderBusinessTasks(); if(currentView==='responses')renderResponses(); if(currentView==='catalog')renderCatalog(); if(currentView==='my-responses')renderMyResponses(); }

function renderBuilder(){
  const scored=scoreTask(state.draft); const level=scoreLevel(scored); const isEditing=Boolean(state.editingTaskId);
  if(!scored.verified)selectedAiFields.clear();
  app.innerHTML=`<section class="page"><header class="page-head"><div><p class="eyebrow">${isEditing?'Редактирование задачи':'Новая задача / конструктор'}</p><h1 class="page-title">${isEditing?'Обновите задачу без потери откликов':'Сделайте задачу понятной — до первого отклика'}</h1><p class="page-subtitle">${isEditing?'После сохранения рейтинг и позиция в каталоге пересчитаются автоматически.':'Опишите потребность своими словами. После проверки рейтинга выберите поля, которые AI должен улучшить.'}</p></div></header>
  <div class="builder-layout"><section class="panel"><div class="panel-body"><div class="panel-topline"><span class="stage-pill">${isEditing?'02 · Редактирование':'01 · Черновик'}</span>${state.draft.aiUsed?'<span class="badge ai">AI-улучшения подтверждены</span>':'<span class="badge">Автосохранение</span>'}</div>
  <form id="builder-form" class="form-grid">
  <label><span>Компания</span><input name="company" value="${escapeHtml(state.draft.company)}" placeholder="Название компании" /></label>
  <label><span>Тема</span><select name="theme">${['UX / исследование','Data / аналитика','Маркетинг / продукт','Сервис / образование','Разработка / автоматизация'].map(x=>`<option ${state.draft.theme===x?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="full"><span>Название задачи</span><input name="title" value="${escapeHtml(state.draft.title)}" placeholder="Например: сократить время обработки обращений" /></label>
  <label class="full"><span>Контекст и потребность</span>${renderAiFieldControl('context','Контекст и потребность',`<textarea name="context" rows="4" placeholder="Что происходит сейчас и что необходимо изменить">${escapeHtml(state.draft.context)}</textarea>`,scored.verified)}<small class="form-hint">Опишите проблему, а не готовое решение.</small></label>
  <label><span>Для кого создаётся решение</span>${renderAiFieldControl('users','Для кого создаётся решение',`<input name="users" value="${escapeHtml(state.draft.users)}" placeholder="Пользователи или сотрудники" />`,scored.verified)}</label>
  <label><span>Срок</span><input name="deadline" type="date" value="${escapeHtml(state.draft.deadline)}" /></label>
  <label class="full"><span>Доступные данные и материалы</span>${renderAiFieldControl('data','Доступные данные и материалы',`<textarea name="data" rows="3" placeholder="Документы, интервью, выгрузки, примеры">${escapeHtml(state.draft.data)}</textarea>`,scored.verified)}</label>
  <label class="full"><span>Ожидаемый результат</span>${renderAiFieldControl('outcome','Ожидаемый результат',`<textarea name="outcome" rows="3" placeholder="Что должна передать команда">${escapeHtml(state.draft.outcome)}</textarea>`,scored.verified)}</label>
  <label><span>Критерии успеха</span>${renderAiFieldControl('criteria','Критерии успеха',`<textarea name="criteria" rows="3" placeholder="Как понять, что решение подходит">${escapeHtml(state.draft.criteria)}</textarea>`,scored.verified)}</label>
  <label><span>Ограничения</span>${renderAiFieldControl('constraints','Ограничения',`<textarea name="constraints" rows="3" placeholder="Сроки, технологии, доступы">${escapeHtml(state.draft.constraints)}</textarea>`,scored.verified)}</label>
  <label class="full"><span>Связь с бизнесом</span>${renderAiFieldControl('contact','Связь с бизнесом',`<input name="contact" value="${escapeHtml(state.draft.contact)}" placeholder="Контакт, формат консультаций, срок ответа" />`,scored.verified)}</label></form>
  <div class="form-actions"><button class="primary-button" id="assess-button" type="button">Проверить рейтинг с AI <span>↗</span></button><button class="secondary-button" id="ai-button" type="button" ${selectedAiFields.size?'':'disabled'}>${improveButtonLabel()}</button><button class="secondary-button" id="publish-button" type="button">${isEditing?'Сохранить изменения':'Опубликовать в каталог'}</button>${isEditing?'<button class="text-button" id="cancel-edit-button" type="button">Отменить редактирование</button>':'<button class="secondary-button" id="demo-button" type="button">Заполнить демо-пример</button><button class="text-button" id="reset-button" type="button">Очистить</button>'}</div></div></section>
  <aside class="panel score-panel"><div class="panel-body"><p class="eyebrow light">Рейтинг готовности</p><div class="score-big"><strong id="score-value">${scored.verified?scored.total:'—'}</strong><span>/100</span></div><span id="score-status" class="status-pill ${level.className}">${level.label}</span><p class="score-copy" id="score-copy">${level.copy}</p><div class="progress" id="score-progress-track" aria-label="${scored.verified?`${scored.total} процентов готовности`:'Рейтинг ещё не проверен'}"><span id="score-progress" style="width:${scored.verified?scored.total:0}%"></span></div><ul class="score-list" id="score-list">${renderScoreItems(scored.items,scored.verified)}</ul><div class="score-foot" id="score-foot">${scored.verified?'AI оценил смысл, конкретность и согласованность полей. Выберите значком ✦ поля для улучшения.':'Баллы появятся только после смысловой AI-проверки. Случайный или нерелевантный текст получит 0.'}</div></div></aside></div></section>`;
  document.querySelector('#builder-form').addEventListener('input',event=>{ if(!event.target.name)return; state.draft[event.target.name]=event.target.value; state.draft.aiUsed=false; state.draft.assessment=null; selectedAiFields.clear(); saveState(); updateBuilderScore(); });
  document.querySelectorAll('[data-ai-field-toggle]').forEach(button=>button.addEventListener('click',event=>{ event.preventDefault(); event.stopPropagation(); toggleAiField(button.dataset.aiFieldToggle,button); }));
  document.querySelector('#assess-button').addEventListener('click',assessDraft);
  document.querySelector('#ai-button').addEventListener('click',openAiImprovements);
  document.querySelector('#publish-button').addEventListener('click',publishDraft);
  document.querySelector('#demo-button')?.addEventListener('click',fillDemoDraft);
  document.querySelector('#cancel-edit-button')?.addEventListener('click',cancelEditing);
  document.querySelector('#reset-button')?.addEventListener('click',()=>{ state.draft={...blankDraft}; saveState(); renderBuilder(); showToast('Черновик очищен'); });
}

function renderScoreItems(items,verified=true){ return items.map(item=>`<li class="${verified&&item.earned===item.weight?'complete':''}"><span>${item.label}</span><b>${verified?item.earned:'—'}/${item.weight}</b></li>`).join(''); }
function updateBuilderScore(){ const scored=scoreTask(state.draft); const level=scoreLevel(scored); document.querySelector('#score-value').textContent=scored.verified?scored.total:'—'; document.querySelector('#score-status').textContent=level.label; document.querySelector('#score-status').className=`status-pill ${level.className}`; document.querySelector('#score-copy').textContent=level.copy; document.querySelector('#score-progress').style.width=`${scored.verified?scored.total:0}%`; document.querySelector('#score-progress-track').setAttribute('aria-label',scored.verified?`${scored.total} процентов готовности`:'Рейтинг ещё не проверен'); document.querySelector('#score-list').innerHTML=renderScoreItems(scored.items,scored.verified); document.querySelector('#score-foot').textContent=scored.verified?'AI оценил смысл, конкретность и согласованность полей. Выберите значком ✦ поля для улучшения.':'Баллы появятся только после смысловой AI-проверки. Случайный или нерелевантный текст получит 0.'; if(!scored.verified){ selectedAiFields.clear(); document.querySelectorAll('[data-ai-field-toggle]').forEach(button=>button.remove()); updateImproveButton(); } }
const aiFieldLabels={context:'Контекст и потребность',users:'Пользователи',data:'Данные и материалы',outcome:'Ожидаемый результат',criteria:'Критерии успеха',constraints:'Ограничения',contact:'Связь с бизнесом'};

async function requestAi(payload){
  aiRequestController?.abort();
  aiRequestController=new AbortController();
  const response=await fetch('/api/ai/refine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:aiRequestController.signal});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'AI-сервис не ответил');
  return result;
}

function improveButtonLabel(){ return selectedAiFields.size?`Улучшить с AI · ${selectedAiFields.size}`:'Улучшить с AI'; }
function renderAiFieldControl(field,label,control,verified){
  if(!verified)return control;
  const selected=selectedAiFields.has(field);
  return `<span class="ai-field-control">${control}<button class="ai-field-toggle ${selected?'selected':''}" type="button" data-ai-field-toggle="${field}" aria-pressed="${selected}" aria-label="${selected?'Не улучшать':'Улучшить'} поле «${escapeHtml(label)}» с AI" title="${selected?'Поле выбрано':'Выбрать для улучшения с AI'}">✦</button></span>`;
}
function updateImproveButton(){ const button=document.querySelector('#ai-button'); if(!button)return; button.disabled=selectedAiFields.size===0; button.textContent=improveButtonLabel(); }
function toggleAiField(field,button){
  if(!aiFieldLabels[field])return;
  const selected=!selectedAiFields.has(field);
  if(selected)selectedAiFields.add(field); else selectedAiFields.delete(field);
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
  button.setAttribute('aria-label',`${selected?'Не улучшать':'Улучшить'} поле «${aiFieldLabels[field]}» с AI`);
  button.title=selected?'Поле выбрано':'Выбрать для улучшения с AI';
  button.classList.remove('just-toggled');
  void button.offsetWidth;
  button.classList.add('just-toggled');
  updateImproveButton();
}

function normalizeAiAssessment(result,signature){
  if(!result||!Array.isArray(result.evaluations))return null;
  const byField=new Map(result.evaluations.map(item=>[item?.field,item]));
  if(byField.size!==scoreFields.length)return null;
  const evaluations=[];
  for(const [field,,max] of scoreFields){
    const item=byField.get(field);
    if(!item||!Number.isInteger(item.earned)||item.earned<0||item.earned>max)return null;
    evaluations.push({field,earned:item.earned,max,reason:String(item.reason||''),suggestion:String(item.suggestion||'')});
  }
  return {signature,total:evaluations.reduce((sum,item)=>sum+item.earned,0),evaluations,summary:String(result.summary||''),warnings:Array.isArray(result.warnings)?result.warnings.map(String).slice(0,7):[],assessedAt:Date.now(),source:'ai'};
}

async function assessDraft(){
  if(!state.draft.title.trim()||!state.draft.context.trim()){
    showToast('Сначала добавьте название и контекст задачи');
    return false;
  }
  const button=document.querySelector('#assess-button');
  const snapshot={...state.draft,assessment:undefined};
  const signature=taskSignature(snapshot);
  button.disabled=true;
  button.textContent='AI проверяет смысл…';
  try{
    const result=await requestAi({action:'assess',draft:snapshot});
    if(taskSignature(state.draft)!==signature){
      showToast('Текст изменился во время проверки — запустите её ещё раз');
      return false;
    }
    const assessment=normalizeAiAssessment(result,signature);
    if(!assessment)throw new Error('AI вернул некорректную оценку');
    state.draft.assessment=assessment;
    selectedAiFields.clear();
    saveState();
    renderBuilder();
    showToast(`AI-проверка завершена: ${assessment.total}/100`);
    return true;
  }catch(error){
    if(error.name!=='AbortError')showToast(error.message);
    return false;
  }finally{
    if(button.isConnected){
      button.disabled=false;
      button.innerHTML='Проверить рейтинг с AI <span>↗</span>';
    }
  }
}

function setAiError(message=''){
  const error=document.querySelector('#ai-error');
  error.textContent=message;
  error.hidden=!message;
}

function setAiBusy(busy,label){
  const button=document.querySelector('#ai-submit-button');
  document.querySelector('#ai-questions').setAttribute('aria-busy',String(busy));
  button.disabled=busy;
  button.innerHTML=busy?'AI анализирует…':`${label} <span>↗</span>`;
}

function renderAiReview(){
  document.querySelector('#ai-eyebrow').textContent='AI-помощник / рекомендации';
  document.querySelector('#ai-title').textContent='AI предлагает улучшения';
  const baseline=scoreTask(state.draft).total;
  const scoreCopy=pendingAiAssessment?`Проверенный рейтинг: ${baseline} → ${pendingAiAssessment.total}. `:'';
  document.querySelector('#ai-lead').textContent=`${scoreCopy}${pendingAiRefinement.summary||'Сравните предложения с текущими значениями. Вы можете отредактировать их перед применением или отклонить целиком.'}`;
  const warnings=pendingAiRefinement.warnings||[];
  const warningsHtml=warnings.length?`<div class="ai-warnings"><b>Нужно проверить</b><ul>${warnings.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`:'';
  document.querySelector('#ai-questions').innerHTML=`${pendingAiFields.map(field=>`<label><span>${escapeHtml(aiFieldLabels[field])}</span><small class="form-hint">Текущее значение: ${escapeHtml(state.draft[field]||'не заполнено')}</small><textarea data-ai-suggestion="${field}" rows="3">${escapeHtml(pendingAiRefinement.improvements[field])}</textarea></label>`).join('')}${warningsHtml}`;
  setAiError();
  setAiBusy(false,'Применить улучшения');
}

async function openAiImprovements(){
  if(!state.draft.title.trim()||!state.draft.context.trim()){
    showToast('Сначала добавьте название и контекст задачи');
    return;
  }
  if(!scoreTask(state.draft).verified){
    showToast('Сначала проверьте рейтинг задачи с AI');
    return;
  }
  const fields=Object.keys(aiFieldLabels).filter(field=>selectedAiFields.has(field));
  if(!fields.length){
    showToast('Выберите значком ✦ поля для улучшения');
    return;
  }
  const button=document.querySelector('#ai-button');
  pendingAiRefinement=null;
  pendingAiFields=[];
  pendingAiAssessment=null;
  button.disabled=true;
  button.textContent='AI готовит улучшения…';
  try{
    const baseline=scoreTask(state.draft);
    const targetScore=baseline.total<100?baseline.total+1:100;
    const draftSnapshot={...state.draft};
    const originalSignature=taskSignature(draftSnapshot);
    let feedback=null;
    let verified=null;
    for(let attempt=0;attempt<3;attempt+=1){
      button.textContent=attempt===0?'AI готовит улучшения…':`AI дорабатывает вариант ${attempt+1}/3…`;
      const result=await requestAi({action:'improve',draft:draftSnapshot,fields,feedback});
      if(!result.improvements||fields.some(field=>typeof result.improvements[field]!=='string'))throw new Error('AI вернул неполные рекомендации');
      const candidate={...draftSnapshot,aiUsed:true,assessment:null};
      fields.forEach(field=>{ candidate[field]=result.improvements[field].trim(); });
      const signature=taskSignature(candidate);
      button.textContent='AI проверяет новый рейтинг…';
      const assessmentResult=await requestAi({action:'assess',draft:candidate});
      const assessment=normalizeAiAssessment(assessmentResult,signature);
      if(!assessment)throw new Error('AI вернул некорректную оценку улучшений');
      if(assessment.total>=targetScore){ verified={result,assessment}; break; }
      feedback={minimumScore:targetScore,previousScore:assessment.total,evaluations:assessment.evaluations.filter(item=>fields.includes(item.field))};
    }
    if(taskSignature(state.draft)!==originalSignature)throw new Error('Текст изменился во время AI-проверки — запустите улучшение ещё раз');
    if(!verified)throw new Error(`AI не смог повысить рейтинг выше ${baseline.total}/100. Исходный текст сохранён — попробуйте выбрать другие поля.`);
    pendingAiRefinement=verified.result;
    pendingAiFields=fields;
    pendingAiAssessment=verified.assessment;
    renderAiReview();
    aiDialog.showModal();
    document.body.classList.add('dialog-open');
  }catch(error){
    if(error.name!=='AbortError')showToast(error.message);
  }finally{
    button.disabled=false;
    button.textContent=improveButtonLabel();
  }
}

document.querySelector('#ai-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!pendingAiRefinement)return;
  const baseline=scoreTask(state.draft);
  const candidate={...state.draft,aiUsed:true,assessment:null};
  document.querySelectorAll('[data-ai-suggestion]').forEach(input=>{ candidate[input.dataset.aiSuggestion]=input.value.trim(); });
  const signature=taskSignature(candidate);
  setAiError();
  setAiBusy(true,'Применить улучшения');
  try{
    let assessment=pendingAiAssessment?.signature===signature?pendingAiAssessment:null;
    if(!assessment){
      const result=await requestAi({action:'assess',draft:candidate});
      assessment=normalizeAiAssessment(result,signature);
    }
    if(!assessment)throw new Error('AI вернул некорректную оценку улучшений');
    const targetScore=baseline.total<100?baseline.total+1:100;
    if(assessment.total<targetScore){
      setAiError(`Изменённые рекомендации получили ${assessment.total}/100. Для применения нужен рейтинг не ниже ${targetScore}/100. Исходный текст сохранён.`);
      setAiBusy(false,'Применить улучшения');
      return;
    }
    candidate.assessment=assessment;
    state.draft=candidate;
    selectedAiFields.clear();
    saveState();
    aiDialog.close();
    renderBuilder();
    showToast(`AI-улучшения применены, рейтинг: ${assessment.total}/100`);
  }catch(error){
    if(error.name!=='AbortError')setAiError(error.message);
    setAiBusy(false,'Применить улучшения');
  }
});
function publishDraft(){
  if(!state.draft.title.trim()||!state.draft.context.trim()){ showToast('Добавьте название и контекст задачи'); return; }
  if(!scoreTask(state.draft).verified){ showToast('Сначала проверьте рейтинг задачи с AI'); return; }
  if(state.editingTaskId){
    const index=state.tasks.findIndex(task=>task.id===state.editingTaskId);
    if(index<0){ clearEditor(); saveState(); showToast('Исходная задача не найдена'); return; }
    const original=state.tasks[index];
    state.tasks[index]={...original,...state.draft,id:original.id,status:original.status||'published',createdAt:Date.now()};
    clearEditor();
    saveState();
    setView('tasks');
    showToast('Изменения сохранены, рейтинг обновлён');
    return;
  }
  state.tasks.push({...state.draft,id:`task-${Date.now()}`,status:'published',createdAt:Date.now()});
  clearEditor();
  saveState();
  setView('tasks');
  showToast('Задача опубликована в общем каталоге');
}

function toggleTaskArchive(id){
  const task=state.tasks.find(item=>item.id===id);
  if(!task)return;
  const archiving=isPublished(task);
  if(archiving&&!window.confirm(`Архивировать задачу «${task.title}»? Она исчезнет из студенческого каталога, но отклики сохранятся.`))return;
  task.status=archiving?'archived':'published';
  saveState();
  renderBusinessTasks();
  showToast(archiving?'Задача архивирована':'Задача восстановлена в каталоге');
}

function renderBusinessTasks(){
  const tasks=[...state.tasks].reverse(); const published=tasks.filter(isPublished); const verifiedScores=tasks.map(scoreTask).filter(score=>score.verified); const avg=verifiedScores.length?Math.round(verifiedScores.reduce((sum,score)=>sum+score.total,0)/verifiedScores.length):0;
  app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">Рабочий стол бизнеса</p><h1 class="page-title medium">Ваши задачи</h1><p class="page-subtitle">Рейтинг пересчитывается после каждого изменения. Отклики не назначают команду автоматически.</p></div><button class="primary-button" data-new-task>Новая задача <span>＋</span></button></header>
  <div class="stats-row"><div class="stat-card"><strong>${published.length}</strong><span>задач в каталоге</span></div><div class="stat-card"><strong>${avg}</strong><span>средний рейтинг</span></div><div class="stat-card"><strong>${state.proposals.filter(p=>p.status==='pending').length}</strong><span>новых откликов</span></div><div class="stat-card"><strong>${state.proposals.filter(p=>p.status==='accepted').length}</strong><span>команд выбрано</span></div></div>
  <div class="list-stack">${tasks.map(task=>{ const scored=scoreTask(task); const level=scoreLevel(scored); const count=state.proposals.filter(p=>p.taskId===task.id).length; const archived=!isPublished(task); return `<article class="list-card ${archived?'is-archived':''}"><div class="mini-score">${scored.verified?scored.total:'—'}</div><div><div class="task-statuses"><span class="status-pill ${level.className}">${level.label}</span>${archived?'<span class="status-pill archived">В архиве</span>':''}</div><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.company)} · ${escapeHtml(task.theme)} · ${formatDate(task.deadline)}</p></div><div class="list-actions"><button class="secondary-button" data-open-task="${task.id}">Открыть</button><button class="secondary-button" data-edit-task="${task.id}">Редактировать</button><button class="${archived?'primary-button':'danger-button'}" data-toggle-archive="${task.id}">${archived?'Восстановить':'Архивировать'}</button><button class="primary-button" data-task-responses="${task.id}">${count} откликов</button></div></article>`; }).join('')}</div></section>`;
}

function renderResponses(taskId=null){ const proposals=state.proposals.filter(p=>!taskId||p.taskId===taskId); app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">Решение принимает бизнес</p><h1 class="page-title medium">Отклики команд</h1><p class="page-subtitle">Сравните идеи и планы. Можно принять одну, несколько или ни одной команды.</p></div></header><div class="list-stack">${proposals.length?proposals.map(renderProposalCard).join(''):emptyState('Откликов пока нет','После публикации задачи здесь появятся предложения студенческих команд.')}</div></section>`; }
function renderProposalCard(proposal){ const task=state.tasks.find(t=>t.id===proposal.taskId); const statusLabel={pending:'На рассмотрении',accepted:'Принята',declined:'Отклонена'}[proposal.status]; return `<article class="proposal-card"><div class="proposal-card-head"><div><p class="eyebrow muted">${escapeHtml(task?.title||'Задача')}</p><h3>${escapeHtml(proposal.team)}</h3><p class="decision-note">${escapeHtml(proposal.timeline)} ${proposal.link?`· <a href="${escapeHtml(proposal.link)}" target="_blank" rel="noreferrer">прототип</a>`:''}</p></div><div class="team-score"><span>${state.teamPoints[proposal.team]||proposal.points||0}</span> баллов</div></div><div class="proposal-grid"><div><h4>Идея</h4><p>${escapeHtml(proposal.idea)}</p></div><div><h4>План</h4><p>${escapeHtml(proposal.plan)}</p></div></div>${proposal.status==='pending'?`<div class="proposal-actions"><button class="primary-button" data-decision="accepted" data-proposal="${proposal.id}">Выбрать команду</button><button class="danger-button" data-decision="declined" data-proposal="${proposal.id}">Отклонить</button></div>`:`<div class="proposal-actions"><span class="status-pill ${proposal.status==='accepted'?'ready':'draft'}">${statusLabel}</span></div>`}</article>`; }
function updateDecision(id,decision){ const proposal=state.proposals.find(p=>p.id===id); if(!proposal)return; proposal.status=decision; if(decision==='accepted'&&!proposal.rewarded){ state.teamPoints[proposal.team]=(state.teamPoints[proposal.team]||proposal.points||0)+250; proposal.rewarded=true; } saveState(); renderResponses(); renderNav(); showToast(decision==='accepted'?'Команда выбрана. Ей начислено 250 баллов прогресса':'Отклик отклонён'); }

function renderCatalog(){ const ranked=state.tasks.filter(isPublished).map(task=>({...task,score:scoreTask(task).total})).sort((a,b)=>b.score-a.score||b.createdAt-a.createdAt); const filtered=ranked.filter(task=>(catalogFilter==='all'||(catalogFilter==='ready'?task.score>=70:task.theme.toLowerCase().includes(catalogFilter)))&&(`${task.title} ${task.company} ${task.theme}`.toLowerCase().includes(searchQuery.toLowerCase()))); app.innerHTML=`<section class="page"><header class="page-head"><div><p class="eyebrow">Открытый каталог</p><h1 class="page-title">Выберите задачу, в которой хотите разобраться</h1><p class="page-subtitle">Все опубликованные задачи доступны всем командам. Рекомендации помогают ориентироваться, но ничего не скрывают.</p></div><div class="team-score"><span>${state.teamPoints['NOVA Lab']||0}</span> баллов NOVA Lab</div></header><div class="catalog-toolbar"><input class="search-input" id="catalog-search" type="search" placeholder="Поиск по задаче, компании или теме" value="${escapeHtml(searchQuery)}"/><div class="filter-group">${[['all','Все'],['ready','70+ готовые'],['data','Data'],['ux','UX'],['маркетинг','Маркетинг']].map(([id,label])=>`<button class="filter-button ${catalogFilter===id?'active':''}" data-filter="${id}">${label}</button>`).join('')}</div></div><div class="task-grid">${filtered.length?filtered.map(renderTaskCard).join(''):emptyState('Ничего не найдено','Попробуйте изменить запрос или открыть все темы.')}</div></section>`; document.querySelector('#catalog-search').addEventListener('input',event=>{ searchQuery=event.target.value; renderCatalog(); const input=document.querySelector('#catalog-search'); input.focus(); input.setSelectionRange(input.value.length,input.value.length); }); }
function renderTaskCard(task){ const scored=scoreTask(task); const level=scoreLevel(scored); const recommended=/ux|data/i.test(task.theme); const count=state.proposals.filter(p=>p.taskId===task.id).length; return `<article class="task-card"><div class="task-card-head"><div>${recommended?'<span class="badge recommended">Подходит вам</span>':`<span class="status-pill ${level.className}">${level.label}</span>`}</div><div class="score-chip">${scored.verified?scored.total:'—'}</div></div><p class="task-company">${escapeHtml(task.company)}</p><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.context)}</p><div class="task-meta"><span class="meta-chip">${escapeHtml(task.theme)}</span><span class="meta-chip">до ${formatDate(task.deadline)}</span></div><div class="card-footer"><span>${count} откликов</span><button class="text-button" data-open-task="${task.id}">Открыть →</button></div></article>`; }
function openTask(id){ const task=state.tasks.find(item=>item.id===id); if(!task||role==='student'&&!isPublished(task))return; const scored=scoreTask(task); const level=scoreLevel(scored); document.querySelector('#task-dialog-content').innerHTML=`<header class="dialog-header"><div><p class="eyebrow">${escapeHtml(task.company)} / ${escapeHtml(task.theme)}</p><h2 id="task-dialog-title">${escapeHtml(task.title)}</h2></div><button class="close-button" data-close-dialog="task-dialog" aria-label="Закрыть">×</button></header><div class="task-detail-grid"><div class="task-detail-copy"><h3>Контекст</h3><p>${escapeHtml(task.context)}</p><h3>Для кого</h3><p>${escapeHtml(task.users)||'Нужно уточнить'}</p><h3>Данные и материалы</h3><p>${escapeHtml(task.data)||'Нужно уточнить'}</p><h3>Ожидаемый результат</h3><p>${escapeHtml(task.outcome)||'Нужно уточнить'}</p><h3>Критерии успеха</h3><p>${escapeHtml(task.criteria)||'Нужно уточнить'}</p><h3>Ограничения</h3><p>${escapeHtml(task.constraints)||'Не указаны'}</p><h3>Связь с бизнесом</h3><p>${escapeHtml(task.contact)||'Нужно уточнить'}</p></div><aside class="detail-aside"><p class="eyebrow light">Рейтинг готовности</p><div class="score-big"><strong>${scored.verified?scored.total:'—'}</strong><span>/100</span></div><span class="status-pill ${level.className}">${level.label}</span><p>${level.copy}</p><p><b>Срок:</b><br>${formatDate(task.deadline)}</p>${role==='student'?`<button class="primary-button" data-apply="${task.id}">Предложить решение</button>`:''}</aside></div>`; taskDialog.showModal(); document.body.classList.add('dialog-open'); }
function openProposal(id){ taskDialog.close(); document.querySelector('#proposal-form [name="taskId"]').value=id; proposalDialog.showModal(); document.body.classList.add('dialog-open'); }
document.querySelector('#proposal-form').addEventListener('submit',event=>{ event.preventDefault(); const fields=Object.fromEntries(new FormData(event.currentTarget).entries()); if(!fields.team.trim()||!fields.idea.trim()||!fields.plan.trim()||!fields.timeline.trim()){ showToast('Заполните команду, идею, план и срок'); return; } state.proposals.push({...fields,id:`p-${Date.now()}`,status:'pending',points:state.teamPoints[fields.team]||300}); if(!state.teamPoints[fields.team])state.teamPoints[fields.team]=300; saveState(); proposalDialog.close(); document.body.classList.remove('dialog-open'); event.currentTarget.reset(); renderNav(); showToast('Отклик отправлен. Решение остаётся за бизнесом'); });
function renderMyResponses(){ const mine=state.proposals.filter(p=>p.team==='NOVA Lab'&&state.tasks.some(task=>task.id===p.taskId&&isPublished(task))); app.innerHTML=`<section class="page narrow"><header class="page-head"><div><p class="eyebrow">NOVA Lab / ${state.teamPoints['NOVA Lab']||0} баллов</p><h1 class="page-title medium">Мои отклики</h1><p class="page-subtitle">Баллы начисляются после подтверждённого этапа работы, а не за количество заявок.</p></div><button class="primary-button" data-view="catalog">Найти задачу</button></header><div class="list-stack">${mine.length?mine.map(p=>{ const task=state.tasks.find(t=>t.id===p.taskId); const scored=scoreTask(task||{}); return `<article class="list-card"><div class="mini-score">${scored.verified?scored.total:'—'}</div><div><span class="status-pill ${p.status==='accepted'?'ready':p.status==='declined'?'draft':'working'}">${{pending:'На рассмотрении',accepted:'Команда выбрана',declined:'Отклонён'}[p.status]}</span><h3>${escapeHtml(task?.title||'Задача')}</h3><p>${escapeHtml(p.idea)}</p></div><div class="list-actions"><button class="secondary-button" data-open-task="${p.taskId}">Карточка задачи</button></div></article>`; }).join(''):emptyState('У команды ещё нет активных откликов','Откройте каталог, выберите интересную задачу и предложите решение.')}</div></section>`; }

document.addEventListener('click',event=>{ const newTaskButton=event.target.closest('[data-new-task]'); if(newTaskButton){ startNewTask(); return; } const editButton=event.target.closest('[data-edit-task]'); if(editButton){ editTask(editButton.dataset.editTask); return; } const archiveButton=event.target.closest('[data-toggle-archive]'); if(archiveButton){ toggleTaskArchive(archiveButton.dataset.toggleArchive); return; } const viewButton=event.target.closest('[data-view]'); if(viewButton){ event.preventDefault(); setView(viewButton.dataset.view); return; } const roleButton=event.target.closest('[data-role]'); if(roleButton){ role=roleButton.dataset.role; currentView=role==='business'?'builder':'catalog'; render(); return; } const taskButton=event.target.closest('[data-open-task]'); if(taskButton)openTask(taskButton.dataset.openTask); const responseButton=event.target.closest('[data-task-responses]'); if(responseButton){ currentView='responses'; renderNav(); renderResponses(responseButton.dataset.taskResponses); } const decisionButton=event.target.closest('[data-decision]'); if(decisionButton)updateDecision(decisionButton.dataset.proposal,decisionButton.dataset.decision); const filterButton=event.target.closest('[data-filter]'); if(filterButton){ catalogFilter=filterButton.dataset.filter; renderCatalog(); } const applyButton=event.target.closest('[data-apply]'); if(applyButton)openProposal(applyButton.dataset.apply); const closeButton=event.target.closest('[data-close-dialog]'); if(closeButton){ document.querySelector(`#${closeButton.dataset.closeDialog}`).close(); document.body.classList.remove('dialog-open'); } });
document.querySelector('#help-button').addEventListener('click',()=>{ document.querySelector('#help-dialog').showModal(); document.body.classList.add('dialog-open'); });
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open')));
aiDialog.addEventListener('close',()=>{ if(aiDialog.open)return; aiRequestController=null; pendingAiRefinement=null; pendingAiFields=[]; pendingAiAssessment=null; setAiError(); });

function registerWebMcpTools(){ const context=document.modelContext; if(!context?.registerTool)return; const register=tool=>Promise.resolve(context.registerTool(tool)).catch(error=>console.warn('WebMCP',error)); register({name:'list_published_tasks',title:'Показать задачи',description:'Возвращает опубликованные бизнес-задачи, отсортированные по рейтингу готовности.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return state.tasks.filter(isPublished).map(t=>({id:t.id,title:t.title,company:t.company,readiness:scoreTask(t).total})).sort((a,b)=>b.readiness-a.readiness);}}); register({name:'create_task_draft',title:'Создать черновик задачи',description:'Создаёт и открывает редактируемый черновик бизнес-задачи. Ничего не публикует.',inputSchema:{type:'object',properties:{title:{type:'string'},context:{type:'string'},company:{type:'string'}},required:['title','context'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input?.title?.trim()||!input?.context?.trim())throw new Error('Нужны title и context');state.draft={...blankDraft,title:input.title.trim(),context:input.context.trim(),company:(input.company||'Моя компания').trim()};state.editingTaskId=null;saveState();role='business';currentView='builder';render();return{status:'draft_created',readiness:scoreTask(state.draft).total};}}); register({name:'submit_team_proposal',title:'Отправить отклик команды',description:'Отправляет отклик на существующую задачу и обновляет список откликов.',inputSchema:{type:'object',properties:{taskId:{type:'string'},team:{type:'string'},idea:{type:'string'},plan:{type:'string'},timeline:{type:'string'}},required:['taskId','team','idea','plan','timeline'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!state.tasks.some(t=>t.id===input.taskId&&isPublished(t)))throw new Error('Задача не найдена или архивирована');const proposal={...input,id:`p-${Date.now()}`,status:'pending',points:state.teamPoints[input.team]||300};state.proposals.push(proposal);saveState();renderNav();return{status:'submitted',proposalId:proposal.id};}}); }

render();
registerWebMcpTools();
