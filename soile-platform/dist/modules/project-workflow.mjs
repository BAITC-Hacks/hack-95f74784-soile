const STAGE_DEFINITIONS = [
  { id: 'selected', label: 'Команда выбрана', order: 0, points: 0 },
  { id: 'plan_confirmed', label: 'План подтверждён', order: 1, points: 100 },
  { id: 'prototype_confirmed', label: 'Прототип подтверждён', order: 2, points: 150 },
  { id: 'result_confirmed', label: 'Итог подтверждён', order: 3, points: 250 },
];

export const STAGES = Object.freeze(
  STAGE_DEFINITIONS.map((stage) => Object.freeze({ ...stage })),
);

export const RATING_WEIGHTS = Object.freeze({
  context: 20,
  data: 20,
  outcome: 15,
  criteria: 15,
  constraints: 10,
  users: 10,
  contact: 10,
});

const VALID_STAGE_STATUSES = new Set(['pending', 'confirmed', 'rejected']);

function workflowError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw workflowError('invalid_input', `${name} должен быть непустой строкой`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function findStageDefinition(stageId) {
  return STAGES.find((stage) => stage.id === stageId);
}

function assertPreviousStageConfirmed(project, definition) {
  const previous = project.stages.find(
    (item) => item.order === definition.order - 1,
  );
  if (!previous || previous.status !== 'confirmed') {
    throw workflowError(
      'stage_order_violation',
      `Сначала подтвердите этап ${previous?.id || 'предыдущий этап'}`,
    );
  }
}

function assertHttpUrl(value) {
  assertNonEmptyString(value, 'url');
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw workflowError('invalid_url', 'Ссылка должна быть абсолютным HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw workflowError('invalid_url', 'Ссылка должна быть абсолютным HTTP(S) URL');
  }
}

function assertProject(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw workflowError('invalid_project', 'Проект должен быть объектом');
  }

  assertNonEmptyString(project.id, 'project.id');
  assertNonEmptyString(project.taskId, 'project.taskId');
  assertNonEmptyString(project.teamId, 'project.teamId');

  if (!Array.isArray(project.stages) || !Array.isArray(project.history)) {
    throw workflowError('invalid_project', 'Проект должен содержать этапы и историю');
  }

  for (const definition of STAGES) {
    const stage = project.stages.find((item) => item.id === definition.id);
    if (!stage || !VALID_STAGE_STATUSES.has(stage.status)) {
      throw workflowError(
        'invalid_project',
        `В проекте отсутствует корректный этап ${definition.id}`,
      );
    }
  }
}

function resolveBusinessActor(project) {
  return project.businessId || project.selectedBy || 'business';
}

function updateDerivedFields(project) {
  const confirmed = project.stages
    .filter((stage) => stage.status === 'confirmed')
    .sort((left, right) => left.order - right.order);

  project.currentStageId = confirmed.at(-1)?.id || 'selected';
  project.points = calculateTeamPoints(project);
  project.status = project.stages.find((stage) => stage.id === 'result_confirmed')
    ?.status === 'confirmed'
    ? 'completed'
    : 'active';

  return project;
}

/** Создаёт новый проект после ручного выбора команды бизнесом. */
export function createProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw workflowError('invalid_input', 'Параметры проекта должны быть объектом');
  }

  assertNonEmptyString(input.id, 'id');
  assertNonEmptyString(input.taskId, 'taskId');
  assertNonEmptyString(input.teamId, 'teamId');
  assertNonEmptyString(input.selectedBy, 'selectedBy');

  const occurredAt = input.occurredAt || nowIso();
  const stages = STAGES.map((definition) => ({
    ...definition,
    status: definition.id === 'selected' ? 'confirmed' : 'pending',
    ...(definition.id === 'selected'
      ? { confirmedAt: occurredAt, confirmedBy: input.selectedBy }
      : {}),
  }));

  return {
    id: input.id.trim(),
    taskId: input.taskId.trim(),
    teamId: input.teamId.trim(),
    businessId: (input.businessId || input.selectedBy).trim(),
    selectedBy: input.selectedBy.trim(),
    createdAt: occurredAt,
    status: 'active',
    currentStageId: 'selected',
    points: 0,
    stages,
    history: [
      {
        action: 'stage_confirmed',
        stageId: 'selected',
        actorId: input.selectedBy.trim(),
        occurredAt,
      },
    ],
  };
}

/** Команда сдаёт ссылку и описание результата для текущего этапа. */
export function submitStage(project, stageId, submission, submittedBy) {
  assertProject(project);
  assertNonEmptyString(stageId, 'stageId');
  assertNonEmptyString(submittedBy, 'submittedBy');

  const definition = findStageDefinition(stageId);
  if (!definition) {
    throw workflowError('unknown_stage', `Неизвестный этап: ${stageId}`);
  }
  if (stageId === 'selected') {
    throw workflowError('stage_not_submittable', 'Выбор команды не требует сдачи результата');
  }
  if (submittedBy.trim() !== project.teamId) {
    throw workflowError('unauthorized_actor', 'Результат может сдать только выбранная команда');
  }
  if (!submission || typeof submission !== 'object' || Array.isArray(submission)) {
    throw workflowError('invalid_input', 'Результат этапа должен быть объектом');
  }
  assertNonEmptyString(submission.description, 'description');
  assertHttpUrl(submission.url);

  const next = clone(project);
  const stage = next.stages.find((item) => item.id === stageId);
  if (stage.status === 'confirmed') {
    throw workflowError('confirmed_stage_locked', 'Подтверждённый этап нельзя сдать повторно');
  }
  assertPreviousStageConfirmed(next, definition);
  if (stage.status === 'pending' && stage.submission) {
    throw workflowError('submission_awaiting_review', 'Результат уже ожидает решения бизнеса');
  }

  const previousRevisions = next.history
    .filter((event) => event.action === 'stage_submitted' && event.stageId === stageId)
    .map((event) => event.submission?.revision || 0);
  const revision = Math.max(stage.submission?.revision || 0, ...previousRevisions) + 1;
  const occurredAt = nowIso();
  stage.status = 'pending';
  stage.submission = {
    description: submission.description.trim(),
    url: submission.url.trim(),
    submittedAt: occurredAt,
    submittedBy: submittedBy.trim(),
    revision,
  };
  delete stage.rejectedAt;
  delete stage.rejectedBy;
  delete stage.rejectionReason;

  next.history.push({
    action: 'stage_submitted',
    stageId,
    actorId: submittedBy.trim(),
    occurredAt,
    submission: { ...stage.submission },
  });

  return updateDerivedFields(next);
}

/** Подтверждает этап без повторного начисления баллов. */
export function confirmStage(project, stageId, confirmedBy) {
  assertProject(project);
  assertNonEmptyString(stageId, 'stageId');
  assertNonEmptyString(confirmedBy, 'confirmedBy');

  const definition = findStageDefinition(stageId);
  if (!definition) {
    throw workflowError('unknown_stage', `Неизвестный этап: ${stageId}`);
  }

  const next = clone(project);
  const stage = next.stages.find((item) => item.id === stageId);

  if (stage.status === 'confirmed') {
    return updateDerivedFields(next);
  }

  if (definition.order > 0) {
    assertPreviousStageConfirmed(next, definition);
    if (!stage.submission) {
      throw workflowError('stage_not_submitted', 'Команда ещё не сдала результат этапа');
    }
    if (stage.status !== 'pending') {
      throw workflowError('stage_not_awaiting_review', 'Ожидается новая сдача результата');
    }
  }

  const occurredAt = nowIso();
  stage.status = 'confirmed';
  stage.confirmedAt = occurredAt;
  stage.confirmedBy = confirmedBy.trim();
  delete stage.rejectedAt;
  delete stage.rejectedBy;
  delete stage.rejectionReason;

  next.history.push({
    action: 'stage_confirmed',
    stageId,
    actorId: confirmedBy.trim(),
    occurredAt,
    ...(stage.submission ? { submissionRevision: stage.submission.revision } : {}),
  });

  return updateDerivedFields(next);
}

/** Отклоняет этап с обязательной причиной и записью в историю. */
export function rejectStage(project, stageId, reason) {
  assertProject(project);
  assertNonEmptyString(stageId, 'stageId');
  assertNonEmptyString(reason, 'reason');

  const definition = findStageDefinition(stageId);
  if (!definition) {
    throw workflowError('unknown_stage', `Неизвестный этап: ${stageId}`);
  }
  if (stageId === 'selected') {
    throw workflowError(
      'stage_not_rejectable',
      'Этап выбора команды нельзя отклонить этим действием',
    );
  }

  const next = clone(project);
  const stage = next.stages.find((item) => item.id === stageId);

  if (stage.status === 'confirmed') {
    throw workflowError(
      'confirmed_stage_locked',
      'Подтверждённый этап нельзя отклонить',
    );
  }

  assertPreviousStageConfirmed(next, definition);
  if (!stage.submission) {
    throw workflowError('stage_not_submitted', 'Команда ещё не сдала результат этапа');
  }
  if (
    stage.status === 'rejected'
    && stage.rejectionReason === reason.trim()
  ) {
    return updateDerivedFields(next);
  }
  if (stage.status !== 'pending') {
    throw workflowError('stage_not_awaiting_review', 'Ожидается новая сдача результата');
  }

  const actorId = resolveBusinessActor(next);
  const occurredAt = nowIso();
  stage.status = 'rejected';
  stage.rejectedAt = occurredAt;
  stage.rejectedBy = actorId;
  stage.rejectionReason = reason.trim();

  next.history.push({
    action: 'stage_rejected',
    stageId,
    actorId,
    reason: reason.trim(),
    occurredAt,
    submissionRevision: stage.submission.revision,
  });

  return updateDerivedFields(next);
}

/** Возвращает сумму баллов только за подтверждённые этапы. */
export function calculateTeamPoints(project) {
  assertProject(project);
  return project.stages.reduce(
    (total, stage) => total + (stage.status === 'confirmed' ? stage.points : 0),
    0,
  );
}

/** Возвращает упорядоченную временную шкалу этапов и связанных событий. */
export function getProjectTimeline(project) {
  assertProject(project);
  const snapshot = clone(project);

  return snapshot.stages
    .sort((left, right) => left.order - right.order)
    .map((stage) => ({
      ...stage,
      events: snapshot.history.filter((event) => event.stageId === stage.id),
    }));
}

/** Возвращает уровень готовности для рейтинга от 0 до 100. */
export function getReadinessLevel(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw workflowError('invalid_score', 'Рейтинг должен быть числом от 0 до 100');
  }
  if (score >= 90) return 'priority';
  if (score >= 70) return 'ready';
  if (score >= 40) return 'working';
  return 'draft';
}

/** Проверяет видимость задачи: низкий рейтинг не влияет на публикацию. */
export function isTaskVisibleInCatalog(task) {
  return Boolean(task && task.status !== 'archived' && task.status !== 'draft');
}
