import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock API module
vi.mock('../api/api', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

import Login from '../pages/Login';

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form with email and password fields', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        // Check for email input by placeholder
        const emailInput = screen.getByPlaceholderText('you@example.com');
        expect(emailInput).toBeInTheDocument();

        // Check for password input by placeholder
        const passwordInput = screen.getByPlaceholderText('••••••••');
        expect(passwordInput).toBeInTheDocument();
    });

    it('renders login and register tabs', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        // Use getAllByText and verify we find the tab buttons
        const loginElements = screen.getAllByText(/войти/i);
        const registerElements = screen.getAllByText(/регистрация/i);

        // At least 1 login and 1 register element should exist (tabs)
        expect(loginElements.length).toBeGreaterThanOrEqual(1);
        expect(registerElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the SmartSphere branding', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const branding = screen.getByText(/SmartSphere/i);
        expect(branding).toBeInTheDocument();
    });
});
