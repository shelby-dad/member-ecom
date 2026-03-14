import { test, expect } from '@playwright/test'

test('home page loads and shows sign in', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /single-tenant shop/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
})
