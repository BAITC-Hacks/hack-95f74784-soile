import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RATING_WEIGHTS,
  getReadinessLevel,
  isTaskVisibleInCatalog,
} from '../dist/modules/project-workflow.mjs';

test('веса рейтинга соответствуют продуктовому контракту и дают 100', () => {
  assert.deepEqual(RATING_WEIGHTS, {
    context: 20,
    data: 20,
    outcome: 15,
    criteria: 15,
    constraints: 10,
    users: 10,
    contact: 10,
  });
  assert.equal(
    Object.values(RATING_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
    100,
  );
});

test('границы уровней готовности определяются точно', () => {
  const cases = [
    [0, 'draft'],
    [39, 'draft'],
    [40, 'working'],
    [69, 'working'],
    [70, 'ready'],
    [89, 'ready'],
    [90, 'priority'],
    [100, 'priority'],
  ];

  for (const [score, expected] of cases) {
    assert.equal(getReadinessLevel(score), expected);
  }
});

test('некорректный рейтинг отклоняется', () => {
  for (const score of [-1, 101, Number.NaN, Infinity, '70']) {
    assert.throws(
      () => getReadinessLevel(score),
      (error) => error.code === 'invalid_score',
    );
  }
});

test('низкий рейтинг не скрывает опубликованную задачу', () => {
  assert.equal(
    isTaskVisibleInCatalog({ status: 'published', score: 0 }),
    true,
  );
  assert.equal(
    isTaskVisibleInCatalog({ status: 'published', score: 39 }),
    true,
  );
});

test('из каталога исключаются только черновики и архивные задачи', () => {
  assert.equal(isTaskVisibleInCatalog({ status: 'draft', score: 100 }), false);
  assert.equal(isTaskVisibleInCatalog({ status: 'archived', score: 100 }), false);
  assert.equal(isTaskVisibleInCatalog({ status: 'published', score: 70 }), true);
});
