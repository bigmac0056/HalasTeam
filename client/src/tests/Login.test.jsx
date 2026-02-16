import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';


vi.mock('../api/api', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        patch: vi.fn(() => Promise.resolve({ data: {} })),
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


        const emailInput = screen.getByPlaceholderText('name@example.com');
        expect(emailInput).toBeInTheDocument();


        const passwordInput = screen.getByPlaceholderText('••••••••');
        expect(passwordInput).toBeInTheDocument();
    });

    it('renders login and register tabs', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );


        const loginElements = screen.getAllByText(/войти/i);
        const registerElements = screen.getAllByText(/регистрация/i);


        expect(loginElements.length).toBeGreaterThanOrEqual(1);
        expect(registerElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the SmartSphere branding', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );


        const branding = screen.getAllByText(/SmartSphere/i);
        expect(branding.length).toBeGreaterThan(0);
    });
});
