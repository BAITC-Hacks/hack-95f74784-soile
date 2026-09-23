import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyAcceptedSuggestions,
  buildClarifyingQuestions,
  buildFieldSuggestions,
  diffTaskFields,
  validateAiAnswers,
} from '../dist/modules/ai-review.mjs';

const draft = Object.freeze({
  title: 'Снизить время ответа поддержки',
  context: 'Клиенты долго ждут первого ответа в чате поддержки.',
  users: '',
  data: '',
  outcome: '',
  criteria: '',
  constraints: '',
  contact: '',
});

const answers = Object.freeze({
  targetUsers: 'Клиенты интернет-магазина, обращающиеся в чат',
  availableData: 'Обезличенная выгрузка обращений за три месяца',
  expectedResult: 'Карта причин задержек и прототип новой очереди',
  successCriteria: 'Первый ответ поступает не позднее пяти минут',
  constraints: 'Нельзя менять используемую CRM',
  businessContact: 'Руководитель поддержки проводит созвон раз в неделю',
});

test('формируется минимум три уместных вопроса', () => {
  const questions = buildClarifyingQuestions(draft);

  assert.ok(questions.length >= 3);
  assert.equal(new Set(questions.map((item) => item.id)).size, questions.length);
  assert.ok(questions.every((item) => item.prompt.endsWith('?')));
  assert.ok(questions.some((item) => item.field === 'criteria'));
});

test('для заполненной карточки всё равно возвращаются три проверочных вопроса', () => {
  const completeDraft = {
    context: 'Достаточно подробный контекст бизнес-задачи для обсуждения.',
    users: 'Сотрудники первой линии службы поддержки компании.',
    data: 'Обезличенные данные обращений и интервью сотрудников.',
    outcome: 'Карта проблем и проверенный прототип рабочего сценария.',
    criteria: 'Сценарий проходит пять тестов без критических ошибок.',
    constraints: 'Три недели, без замены текущей CRM и телефонии.',
    contact: 'Руководитель поддержки доступен два раза в неделю.',
  };

  assert.equal(buildClarifyingQuestions(completeDraft).length, 3);
});

test('валидация нормализует корректные ответы', () => {
  const validation = validateAiAnswers({
    targetUsers: '  Клиенты   магазина ',
    availableData: ' Выгрузка обращений ',
    expectedResult: ' Прототип очереди ',
  });

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.normalized.targetUsers, 'Клиенты магазина');
});

test('AI-предложения содержат только сведения из ответов', () => {
  const suggestions = buildFieldSuggestions(draft, answers);

  assert.equal(suggestions.length, Object.keys(answers).length);
  for (const suggestion of suggestions) {
    const answerKey = suggestion.source.replace('answer.', '');
    assert.equal(suggestion.after, answers[answerKey]);
    assert.ok(suggestion.source.startsWith('answer.'));
  }
});

test('сравнение возвращает только изменившиеся поля', () => {
  const after = {
    ...draft,
    users: answers.targetUsers,
    data: answers.availableData,
  };
  const changes = diffTaskFields(draft, after);

  assert.deepEqual(changes, [
    {
      field: 'users',
      before: '',
      after: answers.targetUsers,
    },
    {
      field: 'data',
      before: '',
      after: answers.availableData,
    },
  ]);
});

test('применяются только выбранные пользователем поля', () => {
  const suggestions = buildFieldSuggestions(draft, answers);
  const result = applyAcceptedSuggestions(
    draft,
    suggestions,
    ['users', 'criteria'],
  );

  assert.equal(result.users, answers.targetUsers);
  assert.equal(result.criteria, answers.successCriteria);
  assert.equal(result.data, draft.data);
  assert.equal(result.outcome, draft.outcome);
});

test('пустые и неполные ответы возвращают явные ошибки', () => {
  const validation = validateAiAnswers({
    targetUsers: ' ',
    availableData: 'Таблица',
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.code === 'empty_answer'));
  assert.ok(
    validation.errors.some((error) => error.code === 'not_enough_answers'),
  );
  assert.throws(
    () => buildFieldSuggestions(draft, { targetUsers: '' }),
    (error) => error.code === 'invalid_ai_answers' && error.details.length > 0,
  );
});

test('неизвестные ключи ответов отклоняются', () => {
  const validation = validateAiAnswers({
    targetUsers: 'Клиенты',
    availableData: 'Таблица',
    expectedResult: 'Прототип',
    privateProfile: 'Не должно использоваться',
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.code === 'unknown_answer'));
});

test('предложение без ссылки на ответ пользователя отклоняется', () => {
  assert.throws(
    () => applyAcceptedSuggestions(
      draft,
      [{ field: 'criteria', after: 'Выдуманный критерий', source: 'model' }],
      ['criteria'],
    ),
    (error) => error.code === 'untrusted_suggestion',
  );
});

test('AI-операции не мутируют входные объекты', () => {
  const sourceDraft = { ...draft };
  const sourceAnswers = { ...answers };
  const draftSnapshot = JSON.stringify(sourceDraft);
  const answersSnapshot = JSON.stringify(sourceAnswers);

  const suggestions = buildFieldSuggestions(sourceDraft, sourceAnswers);
  const result = applyAcceptedSuggestions(
    sourceDraft,
    suggestions,
    ['users'],
  );

  assert.equal(JSON.stringify(sourceDraft), draftSnapshot);
  assert.equal(JSON.stringify(sourceAnswers), answersSnapshot);
  assert.notStrictEqual(result, sourceDraft);
});
