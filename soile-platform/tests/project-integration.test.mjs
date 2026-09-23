import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateTeamPoints,
  confirmStage,
  createProject,
  rejectStage,
  submitStage,
} from '../dist/modules/project-workflow.mjs';

function makeState() {
  return {
    proposals: [
      {
        id: 'proposal-1',
        taskId: 'task-1',
        team: 'NOVA Lab',
        status: 'pending',
      },
    ],
    projects: [],
    teamPoints: { 'NOVA Lab': 780 },
  };
}

function acceptProposal(state, proposalId) {
  const next = structuredClone(state);
  const proposal = next.proposals.find((item) => item.id === proposalId);

  if (!proposal) throw new Error('Отклик не найден');
  proposal.status = 'accepted';

  if (!next.projects.some((project) => project.proposalId === proposal.id)) {
    const project = createProject({
      id: `project-${proposal.id}`,
      taskId: proposal.taskId,
      teamId: proposal.team,
      businessId: 'business-demo',
      selectedBy: 'business-demo',
      occurredAt: '2026-09-23T10:00:00.000Z',
    });
    next.projects.push({
      ...project,
      proposalId: proposal.id,
      teamName: proposal.team,
    });
  }

  return next;
}

function totalTeamScore(state, team) {
  const projectPoints = state.projects
    .filter((project) => project.teamName === team || project.teamId === team)
    .reduce((sum, project) => sum + calculateTeamPoints(project), 0);

  return (state.teamPoints[team] || 0) + projectPoints;
}

function submit(project, stageId) {
  return submitStage(project, stageId, {
    description: `Результат этапа ${stageId}`,
    url: `https://example.org/${stageId}`,
  }, project.teamId);
}

test('принятие отклика создаёт один проект и не начисляет 250 баллов', () => {
  const initial = makeState();
  const accepted = acceptProposal(initial, 'proposal-1');
  const repeated = acceptProposal(accepted, 'proposal-1');

  assert.equal(accepted.projects.length, 1);
  assert.equal(repeated.projects.length, 1);
  assert.equal(calculateTeamPoints(repeated.projects[0]), 0);
  assert.equal(totalTeamScore(repeated, 'NOVA Lab'), 780);
  assert.equal(initial.proposals[0].status, 'pending');
});

test('общий счёт растёт только по подтверждённым этапам', () => {
  const state = acceptProposal(makeState(), 'proposal-1');
  const selectedScore = totalTeamScore(state, 'NOVA Lab');

  state.projects[0] = confirmStage(
    submit(state.projects[0], 'plan_confirmed'),
    'plan_confirmed',
    'business-demo',
  );
  const planScore = totalTeamScore(state, 'NOVA Lab');

  state.projects[0] = confirmStage(
    submit(state.projects[0], 'prototype_confirmed'),
    'prototype_confirmed',
    'business-demo',
  );
  const prototypeScore = totalTeamScore(state, 'NOVA Lab');

  state.projects[0] = confirmStage(
    submit(state.projects[0], 'result_confirmed'),
    'result_confirmed',
    'business-demo',
  );

  assert.equal(selectedScore, 780);
  assert.equal(planScore, 880);
  assert.equal(prototypeScore, 1030);
  assert.equal(totalTeamScore(state, 'NOVA Lab'), 1280);
});

test('отклонение сохраняется после JSON round-trip и не меняет счёт', () => {
  const state = acceptProposal(makeState(), 'proposal-1');
  state.projects[0] = rejectStage(
    submit(state.projects[0], 'plan_confirmed'),
    'plan_confirmed',
    'Добавьте сроки и ответственных',
  );

  const restored = JSON.parse(JSON.stringify(state));
  const stage = restored.projects[0].stages.find(
    (item) => item.id === 'plan_confirmed',
  );

  assert.equal(stage.status, 'rejected');
  assert.equal(stage.rejectionReason, 'Добавьте сроки и ответственных');
  assert.equal(stage.submission.revision, 1);
  assert.equal(restored.projects[0].history.at(-2).action, 'stage_submitted');
  assert.equal(totalTeamScore(restored, 'NOVA Lab'), 780);
});
