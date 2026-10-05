import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Core show flow across the three surfaces: host (keyboard-driven), TV display and a phone.
 * The game is created through the API; everything else happens in the browser.
 */

async function createGame(request: APIRequestContext) {
  const res = await request.post('/api/games', {
    data: {
      name: 'E2E night',
      selectionMode: 'SMART_RANDOM',
      teams: [
        { name: 'Orion', players: ['Ada'] },
        { name: 'Nova', players: ['Bo'] },
        { name: 'Atlas', players: ['Cy'] },
      ],
      config: {
        rounds: [
          { type: 'ELIMINATION', passes: 1, eliminateCount: 1, bestOf: 3, questionIds: [], tiebreakQuestionIds: [], finalCategoryIds: [] },
          { type: 'HEAD_TO_HEAD', passes: 1, eliminateCount: 1, bestOf: 3, questionIds: [], tiebreakQuestionIds: [], finalCategoryIds: [] },
          { type: 'FINAL', passes: 1, eliminateCount: 0, bestOf: 1, questionIds: [], tiebreakQuestionIds: [], finalCategoryIds: [] },
        ],
      },
    },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string; roomCode: string; hostToken: string };
}

async function hostView(request: APIRequestContext, id: string, token: string) {
  const res = await request.get(`/api/games/${id}/view?role=host`, { headers: { 'x-host-token': token } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function pressUntil(page: Page, request: APIRequestContext, id: string, token: string, phase: string) {
  for (let i = 0; i < 12; i++) {
    const v = await hostView(request, id, token);
    if (v.phase === phase) return v;
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
  }
  throw new Error(`Never reached ${phase}`);
}

test('host, display and phone play a question together', async ({ browser, request }) => {
  const game = await createGame(request);

  const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const tv = await tvCtx.newPage();
  const host = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const phone = await (await browser.newContext({ ...{ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } })).newPage();

  await tv.goto(`/display/${game.id}`);
  await expect(tv.getByText(game.roomCode)).toBeVisible();

  // Host opens with the token carried in the URL; it is stored and stripped.
  await host.goto(`/host/${game.id}?t=${game.hostToken}`);
  await expect(host.getByRole('button', { name: /Start game/ })).toBeVisible();
  await expect.poll(() => host.url()).not.toContain('t=');

  // Phone joins as Orion
  await phone.goto(`/join?code=${game.roomCode}`);
  await phone.getByRole('button', { name: /Orion/ }).click();
  await expect(phone.getByText('You’re in')).toBeVisible();
  await expect(tv.locator('text=Orion').first()).toBeVisible();

  // Space drives the show to the first answer
  await host.keyboard.press('Space');
  await expect(tv.getByText('E2E night')).toBeVisible();
  const v = await pressUntil(host, request, game.id, game.hostToken, 'ACCEPTING_ANSWER');
  const orion = v.teams.find((t: { name: string }) => t.name === 'Orion');
  if (v.currentTeamId !== orion.id) {
    await request.post(`/api/games/${game.id}/actions`, { headers: { 'x-host-token': game.hostToken }, data: { role: 'host', action: { type: 'SELECT_TEAM', teamId: orion.id } } });
  }
  const view = await hostView(request, game.id, game.hostToken);
  const q = view.question;

  // Phone sees the question and answers; the TV shows the submission state but no score.
  await expect(phone.getByRole('button', { name: /Submit/ })).toBeVisible();
  const correct = q.answers.filter((a: { correct: boolean; poolIndex: number }) => a.correct && a.poolIndex === 0).sort((a: { score: number }, b: { score: number }) => a.score - b.score);
  if (q.format === 'OPEN' || q.format === 'LINKED') {
    await phone.getByLabel('Your answer').fill(correct[0].canonical);
  } else {
    const item = q.format === 'BOARD' ? q.boardItems.find((b: { id: string }) => q.answers.some((a: { boardItemId: string }) => a.boardItemId === b.id)) : q.boardItems[0];
    await phone.getByRole('option').nth(q.boardItems.indexOf(item)).click();
    if (q.format !== 'BOARD') await phone.getByLabel('Your answer').fill(q.answers.find((a: { boardItemId: string }) => a.boardItemId === item.id).canonical);
  }
  await phone.getByRole('button', { name: /Submit/ }).click();
  await expect(phone.getByText(/Answer sent/)).toBeVisible();
  await expect(tv.getByText(/Answer sent/)).toBeVisible();
  const tvHtml = await tv.content();
  expect(tvHtml).not.toContain('"aliases"');

  // Host locks (Space) and reveals (R); the TV counts down to the score.
  await expect(host.getByText(/Team sent/)).toBeVisible();
  await host.keyboard.press('Space');
  await expect(tv.getByText('Answer locked')).toBeVisible();
  await host.keyboard.press('r');
  await expect(tv.getByText('of 100 people')).toBeVisible();
  const locked = await hostView(request, game.id, game.hostToken);
  const score = locked.currentSubmission.score as number;
  await expect(tv.getByText(String(score), { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await expect(phone.getByText(String(score), { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // Undo returns to the locked state
  await host.keyboard.press('u');
  await expect(host.getByText('Undone')).toBeVisible();
  const after = await hostView(request, game.id, game.hostToken);
  expect(['ANSWER_LOCKED', 'ACCEPTING_ANSWER']).toContain(after.phase);

  // Keyboard help panel lists the shortcuts
  await host.keyboard.press('?');
  await expect(host.getByText('Keyboard shortcuts')).toBeVisible();
  await host.keyboard.press('Escape');
});

test('join page rejects an unknown room code', async ({ page }) => {
  await page.goto('/join');
  await page.getByLabel('Room code').fill('ZZZZZ');
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByText(/No game with that room code/)).toBeVisible();
});

test('admin question bank lists seeded questions and opens the editor', async ({ page }) => {
  await page.goto('/admin/questions');
  await expect(page.getByRole('heading', { name: 'Question bank' })).toBeVisible();
  await expect(page.getByText('Name a country whose English name begins with B')).toBeVisible();
  await page.getByText('Name a country whose English name begins with B').click();
  await expect(page.getByRole('heading', { name: 'Edit question' })).toBeVisible();
  await expect(page.getByText('Ready to play.')).toBeVisible();
});
