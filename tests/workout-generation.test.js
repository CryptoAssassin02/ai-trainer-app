/*
 * Jest tests for WeeklyStructureAgent, DailyWorkoutAgent, AdjustmentAgent
 * and controllers generateWeeklyStructure and adjustPlan with mocked dependencies.
 */

const path = require('path');

// Helpers
function createMockRes() {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
}

// ---- Agent Unit Tests ----

describe('Agents - core behavior', () => {
  const MockOpenAIService = function () {
    this.generateChatCompletion = jest.fn();
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('WeeklyStructureAgent validates inputs and throws on missing goals', async () => {
    const WeeklyStructureAgent = require('../backend/agents/weekly-structure-agent');
    const agent = new WeeklyStructureAgent({ openaiService: new MockOpenAIService() });

    await expect(
      agent.process({ userProfile: {}, userInputs: { trainingFrequency: { daysPerWeek: 4 }, goals: [] }, mesocycleData: { duration: 4, focus: 'general' } })
    ).rejects.toThrow('Weekly structure input validation failed');
  });

  test('WeeklyStructureAgent returns structured weeks with mocked OpenAI', async () => {
    const WeeklyStructureAgent = require('../backend/agents/weekly-structure-agent');
    const mockAI = new MockOpenAIService();
    mockAI.generateChatCompletion.mockResolvedValue({
      choices: [{ message: { parsed: [ { week: 1, days: [ { day: 'Monday', type: 'training', focus: 'push' }, { day: 'Tuesday', type: 'rest' }, { day: 'Wednesday', type: 'training', focus: 'pull' } ] } ] } }]
    });
    const agent = new WeeklyStructureAgent({ openaiService: mockAI });

    const data = await agent.process({ userProfile: {}, userInputs: { trainingFrequency: { daysPerWeek: 4 }, goals: ['strength'] }, mesocycleData: { duration: 4, focus: 'general' } });
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].days.length).toBeGreaterThan(0);
  });

  test('DailyWorkoutAgent requires weeklyStructure', async () => {
    const DailyWorkoutAgent = require('../backend/agents/daily-workout-agent');
    const mockAI = new MockOpenAIService();
    const agent = new DailyWorkoutAgent({ openaiService: mockAI });

    await expect(
      agent.process({ userProfile: {}, userInputs: { goals: ['strength'] }, mesocycleData: { duration: 4 }, weeklyStructure: [] })
    ).rejects.toThrow('Daily workout input validation failed');
  });

  test('DailyWorkoutAgent returns daily workouts with mocked OpenAI', async () => {
    const DailyWorkoutAgent = require('../backend/agents/daily-workout-agent');
    const mockAI = new MockOpenAIService();
    mockAI.generateChatCompletion.mockResolvedValue({
      choices: [{ message: { parsed: [ { day: 'Monday', workout: { name: 'Upper Push', exercises: [ { name: 'Bench Press', sets: 3, reps: 10 } ] } } ] } }]
    });
    const agent = new DailyWorkoutAgent({ openaiService: mockAI });

    const weeklyStructure = [ { week: 1, days: [ { day: 'Monday', type: 'training', focus: 'push' } ] } ];
    const data = await agent.process({ userProfile: {}, userInputs: { goals: ['strength'] }, mesocycleData: { duration: 4, focus: 'general' }, weeklyStructure });
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].workout.exercises[0].name).toBe('Bench Press');
  });

  test('AdjustmentAgent weekly edit appends history and can trigger daily re-run', async () => {
    jest.resetModules();
    jest.doMock('../backend/agents/daily-workout-agent', () => {
      return jest.fn().mockImplementation(() => ({
        safeProcess: jest.fn().mockResolvedValue({ success: true, data: [ { day: 'Monday', workout: { name: 'Updated', exercises: [ { name: 'Pushup', sets: 3, reps: 12 } ] } } ] })
      }));
    });

    const AdjustmentAgent = require('../backend/agents/adjustment-agent');

    const mockAI = new MockOpenAIService();
    // Weekly structure adjustment returns a valid weekly array
    mockAI.generateChatCompletion.mockResolvedValueOnce({ choices: [{ message: { parsed: [ { week: 1, days: [ { day: 'Monday', type: 'training', focus: 'push' }, { day: 'Tuesday', type: 'rest' }, { day: 'Wednesday', type: 'training', focus: 'pull' } ] } ] } }] });

    const agent = new AdjustmentAgent({ openaiService: mockAI, supabaseClient: {} });
    const currentPlanData = { structure: { mesocycles: [ { focus: 'general', duration: 4 }, { focus: 'hypertrophy', duration: 4 } ], trainingFrequency: { daysPerWeek: 4 }, totalDuration: 8 }, userProfile: {} };

    const result = await agent.process({ planId: 'p', agentType: 'weekly_structure', editRequest: 'shift leg day', currentPlanData, userProfile: {}, triggerFollowUps: true }, { useStructuredOutputs: true, mesocycleIndex: 0 });
    expect(Array.isArray(result.mesocycles[0].weekly_structures)).toBe(true);
    expect(Array.isArray(result.mesocycles[0].daily_workouts)).toBe(true);
    expect(Array.isArray(result.adjustment_history)).toBe(true);
  });
});

// ---- Controllers Unit Tests (with mocked Supabase + Agents) ----

describe('Controllers - weekly-structure and adjust', () => {
  let workoutChunked;
  let originalGetClient;

  const makeSupabaseTable = (planRow) => {
    const state = { row: planRow };
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: state.row, error: null })) })) })) })),
        update: jest.fn(() => ({ eq: jest.fn(() => ({ })) })),
        insert: jest.fn()
      }))
    };
  };

  beforeEach(() => {
    jest.resetModules();

    // Mock supabase client helper
    originalGetClient = require('../backend/services/supabase').getSupabaseClientWithToken;
    jest.doMock('../backend/services/supabase', () => ({
      getSupabaseClientWithToken: jest.fn(() => makeSupabaseTable({
        id: 'plan-1',
        user_id: 'user-1',
        total_mesocycles: 3,
        mesocycles_generated: 0,
        plan_data: {
          structure: {
            trainingFrequency: { daysPerWeek: 4 },
            totalDuration: 12,
            totalMesocycles: 3,
            mesocycles: [ { duration: 4, focus: 'general' }, { duration: 4, focus: 'hypertrophy' }, { duration: 4, focus: 'strength' } ]
          },
          userProfile: { userId: 'user-1' },
          mesocycles: []
        }
      }))
    }));

    // Mock OpenAIService used inside agents
    jest.doMock('../backend/services/openai-service', () => {
      return jest.fn().mockImplementation(() => ({
        generateChatCompletion: jest.fn().mockResolvedValue({ choices: [{ message: { parsed: [] } }] })
      }));
    });

    // Mock WeeklyStructureAgent safeProcess
    jest.doMock('../backend/agents/weekly-structure-agent', () => {
      return jest.fn().mockImplementation(() => ({
        safeProcess: jest.fn().mockResolvedValue({ success: true, data: [ { week: 1, days: [ { day: 'Monday', type: 'training', focus: 'push' }, { day: 'Tuesday', type: 'rest' }, { day: 'Wednesday', type: 'training', focus: 'pull' } ] } ] })
      }));
    });

    // Mock AdjustmentAgent safeProcess
    jest.doMock('../backend/agents/adjustment-agent', () => {
      return jest.fn().mockImplementation(() => ({
        safeProcess: jest.fn().mockResolvedValue({ success: true, data: { structure: {}, mesocycles: [ { weekly_structures: [ { week: 1, days: [ { day: 'Monday', type: 'training' } ] } ] } ], adjustment_history: [ { agent: 'weekly_structure', edit: 'e', timestamp: new Date().toISOString() } ] } })
      }));
    });

    workoutChunked = require('../backend/controllers/workout-chunked');
  });

  afterEach(() => {
    try { require('../backend/services/supabase').getSupabaseClientWithToken = originalGetClient; } catch {}
    jest.clearAllMocks();
  });

  test('generateWeeklyStructure returns 200 with weekly structure', async () => {
    const req = {
      params: { planId: 'plan-1', mesocycleNumber: '1' },
      user: { id: 'user-1' },
      headers: { authorization: 'Bearer token' },
      body: {}
    };
    const res = createMockRes();

    await workoutChunked.generateWeeklyStructure(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body?.data?.weeklyStructure?.[0]?.week).toBe(1);
  });

  test('adjustPlan returns 200 and updated plan_data', async () => {
    const req = {
      params: { planId: 'plan-1' },
      body: { agentType: 'weekly_structure', editRequest: 'shift', mesocycleIndex: 0 },
      user: { id: 'user-1' },
      headers: { authorization: 'Bearer token' }
    };
    const res = createMockRes();

    await workoutChunked.adjustPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body?.data?.planData?.mesocycles?.[0]?.weekly_structures?.length).toBeGreaterThan(0);
    expect(res.body?.data?.planData?.adjustment_history?.length).toBeGreaterThan(0);
  });
});
