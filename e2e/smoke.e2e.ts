import { expect, test, type Page } from '@playwright/test';

async function clickSquare(page: Page, square: string) {
  await page.locator(`[data-square="${square}"]`).click();
}

/** 클릭 두 번으로 수를 둔다 (기물 선택 → 도착 칸) */
async function move(page: Page, from: string, to: string) {
  await clickSquare(page, from);
  await clickSquare(page, to);
}

test('AI와 대국하고 기권한 뒤 리뷰가 끝까지 나온다', async ({ page }) => {
  await page.goto('./#/play');
  await page.getByText('입문', { exact: true }).click();
  await page.getByText('♔ 백 (먼저 둠)').click();
  await page.getByRole('button', { name: '대국 시작' }).click();

  await move(page, 'e2', 'e4');
  // AI가 응수하면 다시 내 차례가 된다
  await expect(page.getByText('✋ 당신 차례예요')).toBeVisible({ timeout: 30_000 });
  await move(page, 'g1', 'f3');
  await expect(page.getByText('✋ 당신 차례예요')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: '🏳 기권' }).click();
  await page.getByRole('button', { name: '기권', exact: true }).click();
  await expect(page.getByText('패배', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: '🔍 이 게임 리뷰하기' }).click();
  // 엔진이 모든 국면을 분석하면 정확도가 나온다
  await expect(page.getByText('내 정확도')).toBeVisible({ timeout: 60_000 });
});

test('퍼즐 1개를 풀면 성공으로 기록된다', async ({ page }) => {
  // 정답을 아는 퍼즐 하나만 있는 데이터로 바꿔치기한다 (흑 Kh8 다음 백 Rd8# — 1수 메이트)
  await page.route('**/data/puzzles/index.json', (route) =>
    route.fulfill({
      json: {
        version: 1,
        bandSize: 100,
        bands: [{ band: 1000, file: 'r1000.json', count: 1 }],
        themes: { mateIn1: 1 },
      },
    }),
  );
  await page.route('**/data/puzzles/r1000.json', (route) =>
    route.fulfill({
      json: [['E2E01', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1', 'g8h8 d1d8', 1000, 'mateIn1']],
    }),
  );

  await page.goto('./#/puzzles');
  await page.getByRole('button', { name: '퍼즐 시작' }).click();
  await expect(page.getByText('백으로 가장 좋은 수를 찾으세요')).toBeVisible();
  // 상대 첫 수(Kh8)가 보여진 뒤 둔다
  await expect(page.locator('[data-square="h8"] [data-piece]')).toBeVisible();
  await move(page, 'd1', 'd8');
  await expect(page.getByText('🎉 성공!')).toBeVisible();
});
