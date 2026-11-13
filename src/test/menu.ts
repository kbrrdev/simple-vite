import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** Opens a record's More menu and returns it. */
export async function openMoreMenu() {
  await userEvent.click(await screen.findByRole('button', { name: 'More' }));
  return within(await screen.findByRole('menu'));
}

/** Chooses an item from a record's More menu. */
export async function chooseFromMore(name: string | RegExp) {
  const menu = await openMoreMenu();
  await userEvent.click(menu.getByRole('menuitem', { name }));
}
