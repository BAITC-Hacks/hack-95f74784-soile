import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGES,
  calculateTeamPoints,
  confirmStage,
  createProject,
  getProjectTimeline,
  rejectStage,
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

test('createProject создаёт проект с подтверждённым выбором команды', () => {
  const project = makeProject();

  assert.equal(project.status, 'active');
  assert.equal(project.currentStageId, 'selected');
  assert.equal(project.points, 0);
  assert.equal(project.stages.length, STAGES.length);
  assert.equal(project.stages[0].status, 'confirmed');
  assert.equal(project.stages[1].status, 'pending');
  assert.deepEqual(project.history, [
    {
      action: 'stage_confirmed',
      stageId: 'selected',
      actorId: 'business-1',
      occurredAt: '2026-09-23T10:00:00.000Z',
    },
  ]);
});

test('выбор команды не начисляет баллы', () => {
  const project = makeProject();

  assert.equal(calculateTeamPoints(project), 0);
});

test('баллы начисляются только после последовательного подтверждения этапов', () => {
  const selected = makeProject();
  const plan = confirmStage(selected, 'plan_confirmed', 'business-1');
  const prototype = confirmStage(plan, 'prototype_confirmed', 'business-1');
  const result = confirmStage(prototype, 'result_confirmed', 'business-1');

  assert.equal(calculateTeamPoints(plan), 100);
  assert.equal(calculateTeamPoints(prototype), 250);
  assert.equal(calculateTeamPoints(result), 500);
  assert.equal(result.points, 500);
  assert.equal(result.status, 'completed');
  assert.equal(result.currentStageId, 'result_confirmed');
});

test('нельзя подтвердить этап раньше предыдущего', () => {
  const project = makeProject();

  assert.throws(
    () => confirmStage(project, 'prototype_confirmed', 'business-1'),
    (error) => error.code === 'stage_order_violation',
  );
});

test('повторное подтверждение идемпотентно и не начисляет баллы дважды', () => {
  const project = confirmStage(
    makeProject(),
    'plan_confirmed',
    'business-1',
  );
  const repeated = confirmStage(project, 'plan_confirmed', 'business-1');

  assert.equal(repeated.points, 100);
  assert.equal(repeated.history.length, project.history.length);
  assert.deepEqual(repeated, project);
});

test('отклонённый этап не начисляет баллы и записывается в историю', () => {
  const project = makeProject();
  const rejected = rejectStage(
    project,
    'plan_confirmed',
    'План не содержит сроков',
  );

  const stage = rejected.stages.find((item) => item.id === 'plan_confirmed');
  assert.equal(stage.status, 'rejected');
  assert.equal(stage.rejectionReason, 'План не содержит сроков');
  assert.equal(rejected.points, 0);
  assert.equal(rejected.history.at(-1).action, 'stage_rejected');
  assert.equal(rejected.history.at(-1).actorId, 'business-1');
});

test('после исправления отклонённый этап можно подтвердить', () => {
  const rejected = rejectStage(
    makeProject(),
    'plan_confirmed',
    'Добавьте контрольные точки',
  );
  const confirmed = confirmStage(
    rejected,
    'plan_confirmed',
    'business-1',
  );

  const stage = confirmed.stages.find((item) => item.id === 'plan_confirmed');
  assert.equal(stage.status, 'confirmed');
  assert.equal(stage.rejectionReason, undefined);
  assert.equal(confirmed.points, 100);
});

test('подтверждённый этап нельзя отклонить', () => {
  const confirmed = confirmStage(
    makeProject(),
    'plan_confirmed',
    'business-1',
  );

  assert.throws(
    () => rejectStage(confirmed, 'plan_confirmed', 'Передумали'),
    (error) => error.code === 'confirmed_stage_locked',
  );
});

test('временная шкала содержит все этапы и их события', () => {
  const project = confirmStage(
    makeProject(),
    'plan_confirmed',
    'business-1',
  );
  const timeline = getProjectTimeline(project);

  assert.deepEqual(
    timeline.map((stage) => stage.id),
    STAGES.map((stage) => stage.id),
  );
  assert.equal(timeline[0].events.length, 1);
  assert.equal(timeline[1].events.length, 1);
  assert.equal(timeline[2].events.length, 0);
});

test('операции не мутируют исходный объект', () => {
  const original = makeProject();
  const snapshot = JSON.stringify(original);

  const confirmed = confirmStage(
    original,
    'plan_confirmed',
    'business-1',
  );
  rejectStage(original, 'plan_confirmed', 'Нужно уточнение');
  getProjectTimeline(original);

  assert.equal(JSON.stringify(original), snapshot);
  assert.notStrictEqual(confirmed, original);
  assert.notStrictEqual(confirmed.stages, original.stages);
});
