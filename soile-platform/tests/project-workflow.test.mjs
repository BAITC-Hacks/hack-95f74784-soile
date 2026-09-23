import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGES,
  calculateTeamPoints,
  confirmStage,
  createProject,
  getProjectTimeline,
  rejectStage,
  submitStage,
} from '../dist/modules/project-workflow.mjs';

function makeProject() {
  return createProject({
    id: 'project-1',
    taskId: 'task-1',
    teamId: 'team-1',
    businessId: 'business-1',
    selectedBy: 'business-1',
    occurredAt: '2026-09-23T10:00:00.000Z',
  });
}

function submit(project, stageId, description = 'Ссылка на результат', url = 'https://example.org/result') {
  return submitStage(project, stageId, { description, url }, 'team-1');
}

test('выбор команды создаёт проект с нулём баллов', () => {
  const project = makeProject();

  assert.equal(project.status, 'active');
  assert.equal(project.currentStageId, 'selected');
  assert.equal(calculateTeamPoints(project), 0);
  assert.equal(project.stages.length, STAGES.length);
  assert.equal(project.stages[0].status, 'confirmed');
  assert.equal(project.stages[1].status, 'pending');
  assert.deepEqual(project.history, [{
    action: 'stage_confirmed',
    stageId: 'selected',
    actorId: 'business-1',
    occurredAt: '2026-09-23T10:00:00.000Z',
  }]);
});

test('решение бизнеса требует сдачи результата командой', () => {
  const project = makeProject();

  assert.throws(
    () => confirmStage(project, 'plan_confirmed', 'business-1'),
    (error) => error.code === 'stage_not_submitted',
  );
  assert.throws(
    () => rejectStage(project, 'plan_confirmed', 'План неполный'),
    (error) => error.code === 'stage_not_submitted',
  );
  assert.equal(calculateTeamPoints(project), 0);
});

test('сдача требует описания и абсолютной ссылки HTTP(S)', () => {
  const project = makeProject();
  const invalid = [
    [{ description: '', url: 'https://example.org/result' }, 'invalid_input'],
    [{ description: 'Готово', url: '/result' }, 'invalid_url'],
    [{ description: 'Готово', url: 'javascript:alert(1)' }, 'invalid_url'],
    [{ description: 'Готово', url: 'https://' }, 'invalid_url'],
  ];

  for (const [submission, code] of invalid) {
    assert.throws(
      () => submitStage(project, 'plan_confirmed', submission, 'team-1'),
      (error) => error.code === code,
    );
  }
});

test('только выбранная команда может сдать текущий этап', () => {
  const project = makeProject();

  assert.throws(
    () => submitStage(project, 'plan_confirmed', {
      description: 'План',
      url: 'https://example.org/plan',
    }, 'another-team'),
    (error) => error.code === 'unauthorized_actor',
  );
  assert.throws(
    () => submit(project, 'prototype_confirmed'),
    (error) => error.code === 'stage_order_violation',
  );
  assert.throws(
    () => submit(project, 'selected'),
    (error) => error.code === 'stage_not_submittable',
  );
});

test('сдача сохраняет очищенные поля, автора, ревизию и снимок в истории', () => {
  const original = makeProject();
  const submitted = submit(original, 'plan_confirmed', '  План и сроки  ', '  https://example.org/plan  ');
  const stage = submitted.stages.find((item) => item.id === 'plan_confirmed');
  const event = submitted.history.at(-1);

  assert.equal(stage.status, 'pending');
  assert.equal(stage.submission.description, 'План и сроки');
  assert.equal(stage.submission.url, 'https://example.org/plan');
  assert.equal(stage.submission.submittedBy, 'team-1');
  assert.equal(stage.submission.revision, 1);
  assert.equal(event.action, 'stage_submitted');
  assert.equal(event.actorId, 'team-1');
  assert.deepEqual(event.submission, stage.submission);
  assert.equal(submitted.points, 0);
  assert.equal(original.stages[1].submission, undefined);
});

test('повторная сдача ожидающего решения этапа отклоняется', () => {
  const submitted = submit(makeProject(), 'plan_confirmed');

  assert.throws(
    () => submit(submitted, 'plan_confirmed', 'Новый план'),
    (error) => error.code === 'submission_awaiting_review',
  );
});

test('баллы начисляются только после последовательного подтверждения сданных этапов', () => {
  const selected = makeProject();
  const plan = confirmStage(submit(selected, 'plan_confirmed'), 'plan_confirmed', 'business-1');
  const prototype = confirmStage(submit(plan, 'prototype_confirmed'), 'prototype_confirmed', 'business-1');
  const result = confirmStage(submit(prototype, 'result_confirmed'), 'result_confirmed', 'business-1');

  assert.equal(calculateTeamPoints(plan), 100);
  assert.equal(calculateTeamPoints(prototype), 250);
  assert.equal(calculateTeamPoints(result), 500);
  assert.equal(result.points, 500);
  assert.equal(result.status, 'completed');
  assert.equal(result.currentStageId, 'result_confirmed');
});

test('нельзя подтвердить этап раньше предыдущего', () => {
  assert.throws(
    () => confirmStage(makeProject(), 'prototype_confirmed', 'business-1'),
    (error) => error.code === 'stage_order_violation',
  );
});

test('повторное подтверждение не начисляет баллы дважды', () => {
  const confirmed = confirmStage(submit(makeProject(), 'plan_confirmed'), 'plan_confirmed', 'business-1');
  const repeated = confirmStage(confirmed, 'plan_confirmed', 'business-1');

  assert.equal(repeated.points, 100);
  assert.deepEqual(repeated, confirmed);
});

test('отклонение сохраняет доказательство, причину и нулевой счёт', () => {
  const submitted = submit(makeProject(), 'plan_confirmed', 'Первая версия');
  const rejected = rejectStage(submitted, 'plan_confirmed', 'План не содержит сроков');
  const stage = rejected.stages.find((item) => item.id === 'plan_confirmed');

  assert.equal(stage.status, 'rejected');
  assert.equal(stage.rejectionReason, 'План не содержит сроков');
  assert.equal(stage.submission.description, 'Первая версия');
  assert.equal(rejected.points, 0);
  assert.equal(rejected.history.at(-1).action, 'stage_rejected');
  assert.equal(rejected.history.at(-1).submissionRevision, 1);
  assert.deepEqual(rejectStage(rejected, 'plan_confirmed', 'План не содержит сроков'), rejected);
  assert.throws(
    () => confirmStage(rejected, 'plan_confirmed', 'business-1'),
    (error) => error.code === 'stage_not_awaiting_review',
  );
});

test('после отклонения команда сдаёт новую ревизию без потери истории', () => {
  const first = submit(makeProject(), 'plan_confirmed', 'Первая версия');
  const rejected = rejectStage(first, 'plan_confirmed', 'Добавьте сроки');
  const second = submit(rejected, 'plan_confirmed', 'План со сроками', 'https://example.org/plan-v2');
  const stage = second.stages.find((item) => item.id === 'plan_confirmed');
  const confirmed = confirmStage(second, 'plan_confirmed', 'business-1');

  assert.equal(stage.status, 'pending');
  assert.equal(stage.rejectionReason, undefined);
  assert.equal(stage.submission.revision, 2);
  assert.equal(stage.submission.url, 'https://example.org/plan-v2');
  assert.deepEqual(second.history.filter((event) => event.action === 'stage_submitted')
    .map((event) => event.submission.description), ['Первая версия', 'План со сроками']);
  assert.equal(confirmed.points, 100);
  assert.equal(confirmed.history.at(-1).submissionRevision, 2);
});

test('подтверждённый этап нельзя изменить или отклонить', () => {
  const confirmed = confirmStage(submit(makeProject(), 'plan_confirmed'), 'plan_confirmed', 'business-1');

  assert.throws(
    () => submit(confirmed, 'plan_confirmed'),
    (error) => error.code === 'confirmed_stage_locked',
  );
  assert.throws(
    () => rejectStage(confirmed, 'plan_confirmed', 'Передумали'),
    (error) => error.code === 'confirmed_stage_locked',
  );
});

test('старые подтверждённые этапы без сдачи остаются действительными', () => {
  const legacy = makeProject();
  legacy.stages[1].status = 'confirmed';
  legacy.stages[1].confirmedAt = '2026-09-23T11:00:00.000Z';
  legacy.stages[1].confirmedBy = 'business-1';
  legacy.points = 100;

  const restored = confirmStage(legacy, 'plan_confirmed', 'business-1');
  assert.equal(restored.points, 100);
  assert.equal(restored.stages[1].submission, undefined);
  assert.equal(restored.history.length, legacy.history.length);
});

test('временная шкала и JSON round-trip сохраняют версии сдачи', () => {
  const first = submit(makeProject(), 'plan_confirmed', 'Первая версия');
  const rejected = rejectStage(first, 'plan_confirmed', 'Нужны сроки');
  const second = submit(rejected, 'plan_confirmed', 'Вторая версия');
  const restored = JSON.parse(JSON.stringify(second));
  const timeline = getProjectTimeline(restored);

  assert.deepEqual(timeline.map((stage) => stage.id), STAGES.map((stage) => stage.id));
  assert.deepEqual(timeline[1].events.map((event) => event.action), [
    'stage_submitted', 'stage_rejected', 'stage_submitted',
  ]);
  assert.equal(timeline[1].events[0].submission.description, 'Первая версия');
  assert.equal(timeline[1].events[2].submission.description, 'Вторая версия');
  assert.equal(timeline[1].submission.revision, 2);
  assert.equal(calculateTeamPoints(restored), 0);
});

test('операции не мутируют исходный объект', () => {
  const original = makeProject();
  const snapshot = JSON.stringify(original);
  const submitted = submit(original, 'plan_confirmed');
  const submittedSnapshot = JSON.stringify(submitted);
  confirmStage(submitted, 'plan_confirmed', 'business-1');
  rejectStage(submitted, 'plan_confirmed', 'Нужно уточнение');
  getProjectTimeline(submitted);

  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(JSON.stringify(submitted), submittedSnapshot);
});
