const FIELD_RULES = Object.freeze([
  {
    answerKey: 'problemContext',
    field: 'context',
    prompt: 'Что происходит сейчас и почему это важно изменить?',
  },
  {
    answerKey: 'targetUsers',
    field: 'users',
    prompt: 'Для каких пользователей или сотрудников создаётся решение?',
  },
  {
    answerKey: 'availableData',
    field: 'data',
    prompt: 'Какие данные, материалы или примеры команда получит в первый день?',
  },
  {
    answerKey: 'expectedResult',
    field: 'outcome',
    prompt: 'Какой конкретный результат должна передать команда?',
  },
  {
    answerKey: 'successCriteria',
    field: 'criteria',
    prompt: 'По каким измеримым признакам бизнес примет результат?',
  },
  {
    answerKey: 'constraints',
    field: 'constraints',
    prompt: 'Какие сроки, технологии или доступы ограничивают решение?',
  },
  {
    answerKey: 'businessContact',
    field: 'contact',
    prompt: 'Кто консультирует команду и как быстро отвечает на вопросы?',
  },
]);

const EDITABLE_FIELDS = new Set(FIELD_RULES.map((rule) => rule.field));
const ANSWER_KEYS = new Set(FIELD_RULES.map((rule) => rule.answerKey));

function aiReviewError(code, message, details = []) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function assertRecord(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw aiReviewError('invalid_input', `${name} должен быть объектом`);
  }
}

function normalizeText(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
}

function fieldNeedsClarification(draft, field) {
  return normalizeText(draft[field]).length < 24;
}

/** Формирует минимум три вопроса на основе неполных полей черновика. */
export function buildClarifyingQuestions(draft) {
  assertRecord(draft, 'draft');

  const missingFirst = [...FIELD_RULES].sort((left, right) => {
    const leftMissing = fieldNeedsClarification(draft, left.field) ? 0 : 1;
    const rightMissing = fieldNeedsClarification(draft, right.field) ? 0 : 1;
    return leftMissing - rightMissing;
  });

  const count = Math.max(
    3,
    missingFirst.filter((rule) => fieldNeedsClarification(draft, rule.field)).length,
  );

  return missingFirst.slice(0, count).map((rule, index) => ({
    id: rule.answerKey,
    field: rule.field,
    order: index + 1,
    prompt: rule.prompt,
    currentValue: normalizeText(draft[rule.field]),
  }));
}

/** Проверяет ответы и возвращает нормализованные значения и явные ошибки. */
export function validateAiAnswers(answers) {
  const errors = [];

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return {
      valid: false,
      normalized: {},
      errors: [{ field: 'answers', code: 'invalid_type', message: 'Ответы должны быть объектом' }],
    };
  }

  const normalized = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!ANSWER_KEYS.has(key)) {
      errors.push({
        field: key,
        code: 'unknown_answer',
        message: `Неизвестный ответ: ${key}`,
      });
      continue;
    }

    const text = normalizeText(value);
    if (!text) {
      errors.push({
        field: key,
        code: 'empty_answer',
        message: 'Ответ не должен быть пустым',
      });
      continue;
    }
    normalized[key] = text;
  }

  if (Object.keys(normalized).length < 3) {
    errors.push({
      field: 'answers',
      code: 'not_enough_answers',
      message: 'Нужно заполнить минимум три ответа',
    });
  }

  return { valid: errors.length === 0, normalized, errors };
}

/** Создаёт предложения только из явно переданных ответов пользователя. */
export function buildFieldSuggestions(draft, answers) {
  assertRecord(draft, 'draft');
  const validation = validateAiAnswers(answers);

  if (!validation.valid) {
    throw aiReviewError(
      'invalid_ai_answers',
      'Ответы AI-уточнения не прошли проверку',
      validation.errors,
    );
  }

  return FIELD_RULES
    .filter((rule) => validation.normalized[rule.answerKey])
    .map((rule) => ({
      field: rule.field,
      before: normalizeText(draft[rule.field]),
      after: validation.normalized[rule.answerKey],
      source: `answer.${rule.answerKey}`,
    }));
}

/** Сравнивает поддерживаемые поля двух карточек и возвращает изменения. */
export function diffTaskFields(before, after) {
  assertRecord(before, 'before');
  assertRecord(after, 'after');

  return FIELD_RULES
    .map((rule) => {
      const previousValue = normalizeText(before[rule.field]);
      const nextValue = normalizeText(after[rule.field]);
      return {
        field: rule.field,
        before: previousValue,
        after: nextValue,
      };
    })
    .filter((change) => change.before !== change.after);
}

/** Применяет только явно принятые пользователем предложения. */
export function applyAcceptedSuggestions(draft, suggestions, acceptedFields) {
  assertRecord(draft, 'draft');
  if (!Array.isArray(suggestions) || !Array.isArray(acceptedFields)) {
    throw aiReviewError(
      'invalid_input',
      'suggestions и acceptedFields должны быть массивами',
    );
  }

  const accepted = new Set(acceptedFields);
  const result = { ...draft };

  for (const suggestion of suggestions) {
    if (!suggestion || typeof suggestion !== 'object') {
      throw aiReviewError('invalid_suggestion', 'Некорректное AI-предложение');
    }
    if (!EDITABLE_FIELDS.has(suggestion.field)) {
      throw aiReviewError(
        'unsupported_field',
        `Поле ${suggestion.field} нельзя изменить через AI`,
      );
    }
    if (
      typeof suggestion.source !== 'string'
      || !suggestion.source.startsWith('answer.')
      || !normalizeText(suggestion.after)
    ) {
      throw aiReviewError(
        'untrusted_suggestion',
        `Предложение для ${suggestion.field} не связано с ответом пользователя`,
      );
    }

    if (accepted.has(suggestion.field)) {
      result[suggestion.field] = normalizeText(suggestion.after);
    }
  }

  return result;
}
