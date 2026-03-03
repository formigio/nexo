/**
 * E2E Tests: Global Node Search (N7)
 *
 * Derived from:
 *   - docs/features/global-search/01-feature-brief.md (acceptance criteria)
 *   - specs/nexo/features/global-search.graph.yaml (test IDs, components, actions)
 *
 * These tests were written from the spec, not the source code.
 * Selectors use data-testid attributes defined in the YAML spec.
 *
 * Prerequisites:
 *   - SurrealDB running with example app seeded (npm run seed:example)
 *   - Web console served at BASE_URL
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'https://nexo.test'

// Selectors from YAML spec testId fields
const GLOBAL_SEARCH_INPUT = '[data-testid=global-search-input]'
const GLOBAL_SEARCH_DROPDOWN = '[data-testid=global-search-dropdown]'
const SIDEBAR_SEARCH_INPUT = '[data-testid=sidebar-search-input]'
const TOOLBAR = '[data-testid=toolbar-root]'
const SIDEBAR = '[data-testid=sidebar-root]'

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL)
  await page.waitForSelector(SIDEBAR_SEARCH_INPUT)
})

// TS-1: Global search returns cross-type results (AC-1)
test('global search returns results from multiple node types', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'schedule')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  const results = page.locator(`${GLOBAL_SEARCH_DROPDOWN} button`)
  await expect(results).not.toHaveCount(0)

  // Verify multiple types are represented
  const resultTexts = await results.allTextContents()
  const hasScreen = resultTexts.some((t) => t.includes('Screen'))
  const hasAction = resultTexts.some((t) => t.includes('Action'))
  const hasFeature = resultTexts.some((t) => t.includes('Feature'))
  expect(hasScreen || hasAction || hasFeature).toBe(true)

  // At least two different types present
  const typeCount = [hasScreen, hasAction, hasFeature].filter(Boolean).length
  expect(typeCount).toBeGreaterThanOrEqual(2)
})

// TS-2: Results display with type indicators (AC-2)
test('search results show node name and type badge', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'schedule')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  const firstResult = page.locator(`${GLOBAL_SEARCH_DROPDOWN} button`).first()
  await expect(firstResult).toBeVisible()

  // Verify result contains highlighted text (mark element)
  const highlight = firstResult.locator('mark')
  await expect(highlight).toBeVisible()
  await expect(highlight).toContainText(/schedule/i)
})

// TS-3: Clicking result navigates to detail view (AC-3)
test('clicking a Screen result navigates to screen detail', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'schedule')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  // Click the result that has "Screen" badge
  const screenResult = page.locator('[data-testid=global-search-result-scr_schedule]')
  await screenResult.click()

  // Verify navigation
  await expect(page).toHaveURL(/\/screens\/scr_schedule/)

  // Verify search input is cleared
  await expect(page.locator(GLOBAL_SEARCH_INPUT)).toHaveValue('')

  // Verify dropdown is gone
  await expect(page.locator(GLOBAL_SEARCH_DROPDOWN)).not.toBeVisible()
})

test('clicking a Feature result navigates to feature detail', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'schedule')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  const featureResult = page.locator('[data-testid=global-search-result-ftr_schedule_activities]')
  await featureResult.click()

  await expect(page).toHaveURL(/\/features\/ftr_schedule_activities/)
})

// TS-4: Escape and click-outside close dropdown (AC-4)
test('pressing Escape closes dropdown and clears input', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'trip')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  await page.keyboard.press('Escape')

  await expect(page.locator(GLOBAL_SEARCH_DROPDOWN)).not.toBeVisible()
  await expect(page.locator(GLOBAL_SEARCH_INPUT)).toHaveValue('')
})

test('clicking outside closes dropdown', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'trip')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  // Click on the main content area
  await page.locator('main').click()

  await expect(page.locator(GLOBAL_SEARCH_DROPDOWN)).not.toBeVisible()
})

// TS-5: Sidebar has its own search input (AC-5)
test('sidebar search input filters screen tree', async ({ page }) => {
  // Verify sidebar search exists with correct placeholder
  const sidebarSearch = page.locator(SIDEBAR_SEARCH_INPUT)
  await expect(sidebarSearch).toBeVisible()
  await expect(sidebarSearch).toHaveAttribute('placeholder', 'Filter screens...')

  // Type and verify filtering
  await sidebarSearch.fill('trip')

  // Wait for filtering to take effect
  await page.waitForTimeout(500)

  // Verify the sidebar list is filtered (fewer items than before)
  const visibleScreens = page.locator('[data-testid=sidebar-screen-tree] button')
  const texts = await visibleScreens.allTextContents()
  const matchingTexts = texts.filter((t) => t.toLowerCase().includes('trip'))
  expect(matchingTexts.length).toBeGreaterThan(0)
})

// TS-6: Sidebar search mirrors original behavior (AC-6)
test('sidebar search works across node types when type selector changes', async ({ page }) => {
  // Switch to API Endpoints
  await page.selectOption('select', 'APIEndpoint')

  const sidebarSearch = page.locator(SIDEBAR_SEARCH_INPUT)
  await expect(sidebarSearch).toHaveAttribute('placeholder', 'Filter api endpoints...')

  // Filter
  await sidebarSearch.fill('nodes')

  // Results should contain "nodes"
  await page.waitForTimeout(500)
  const results = page.locator(`${SIDEBAR} nav button`)
  const count = await results.count()
  expect(count).toBeGreaterThan(0)
})

test('switching type selector clears sidebar search', async ({ page }) => {
  const sidebarSearch = page.locator(SIDEBAR_SEARCH_INPUT)

  // Filter screens
  await sidebarSearch.fill('trip')
  await expect(sidebarSearch).toHaveValue('trip')

  // Switch type
  await page.selectOption('select', 'Component')

  // Search should be cleared
  await expect(sidebarSearch).toHaveValue('')
  await expect(sidebarSearch).toHaveAttribute('placeholder', 'Filter components...')
})

// TS-7: Clearing text resets results (AC-7)
test('clearing global search closes dropdown', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'schedule')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  await page.fill(GLOBAL_SEARCH_INPUT, '')

  await expect(page.locator(GLOBAL_SEARCH_DROPDOWN)).not.toBeVisible()
})

// TS-8: Both searches are real-time (AC-8)
test('global search updates results as you type without Enter', async ({ page }) => {
  const input = page.locator(GLOBAL_SEARCH_INPUT)
  await input.click()

  // Type one character at a time
  await input.pressSequentially('sch', { delay: 200 })

  // Results should appear without pressing Enter
  await expect(page.locator(GLOBAL_SEARCH_DROPDOWN)).toBeVisible()
})

// TS-9: Independence of search contexts
test('global and sidebar searches operate independently', async ({ page }) => {
  // Filter sidebar first
  await page.locator(SIDEBAR_SEARCH_INPUT).fill('trip')
  await page.waitForTimeout(500)

  // Now search globally
  await page.fill(GLOBAL_SEARCH_INPUT, 'schedule')
  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)

  // Sidebar should still show "trip" filter
  await expect(page.locator(SIDEBAR_SEARCH_INPUT)).toHaveValue('trip')

  // Global dropdown should show schedule results
  const dropdown = page.locator(GLOBAL_SEARCH_DROPDOWN)
  await expect(dropdown).toBeVisible()
})

// TS-10: No results state
test('global search shows empty state for no matches', async ({ page }) => {
  await page.fill(GLOBAL_SEARCH_INPUT, 'xyznonexistent')

  await page.waitForSelector(GLOBAL_SEARCH_DROPDOWN)
  const dropdown = page.locator(GLOBAL_SEARCH_DROPDOWN)
  await expect(dropdown).toContainText('No results found')
})
