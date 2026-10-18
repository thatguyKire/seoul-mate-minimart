import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App placeholder', () => {
  it('names the store in the main heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Seoul-Mate Minimart' }),
    ).toBeInTheDocument();
  });

  it('links to the store on Messenger', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Messenger' })).toHaveAttribute(
      'href',
      'https://m.me/61594474910928',
    );
  });
});
