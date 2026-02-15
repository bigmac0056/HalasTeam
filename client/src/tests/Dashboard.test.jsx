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

// Mock navigator.geolocation
const mockGeolocation = {
    getCurrentPosition: vi.fn((success) => {
        success({ coords: { latitude: 55.75, longitude: 37.62 } });
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
};
Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
});

import Dashboard from '../pages/Dashboard';
import API from '../api/api';

// Helper: setup all required API mocks (Dashboard needs devices, settings, automation + Header needs profile, notifications)
const setupMocks = (deviceOverride = null) => {
    API.get.mockImplementation((url) => {
        if (url === '/devices') {
            return Promise.resolve(deviceOverride || { data: { devices: [], count: 0 } });
        }
        if (url === '/settings/mode') return Promise.resolve({ data: { mode: 'Home' } });
        if (url === '/automation/logs') return Promise.resolve({ data: { logs: [] } });
        if (url === '/profile') return Promise.resolve({ data: { name: 'Test User', email: 'test@test.com', avatar: '' } });
        if (url === '/notifications') return Promise.resolve({ data: { notifications: [] } });
        if (url.startsWith('/weather')) return Promise.resolve({ data: { temperature: 20, windspeed: 5, weathercode: 0 } });
        return Promise.resolve({ data: {} });
    });
};

describe('Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'test-jwt-token');
        setupMocks();
    });

    it('renders welcome heading', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        const heading = await screen.findByText(/Добро пожаловать домой/i);
        expect(heading).toBeInTheDocument();
    });

    it('renders add device button', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        const addButtons = await screen.findAllByText(/Добавить устройство/i);
        expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders home mode buttons', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        const homeBtn = await screen.findByText('Дома');
        const awayBtn = await screen.findByText('Ушел');
        const nightBtn = await screen.findByText('Ночь');
        const vacationBtn = await screen.findByText('Отпуск');

        expect(homeBtn).toBeInTheDocument();
        expect(awayBtn).toBeInTheDocument();
        expect(nightBtn).toBeInTheDocument();
        expect(vacationBtn).toBeInTheDocument();
    });

    it('shows empty state when no devices', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        const emptyMsg = await screen.findByText(/Устройства не найдены/i);
        expect(emptyMsg).toBeInTheDocument();
    });

    it('renders device cards with brightness slider for lights', async () => {
        setupMocks({
            data: {
                devices: [
                    { id: '1', name: 'Test Lamp', room: 'Living Room', type: 'Light', source: 'Philips', status: true, brightness: 75 }
                ],
                count: 1
            }
        });

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        const deviceName = await screen.findByText('Test Lamp');
        expect(deviceName).toBeInTheDocument();

        // Brightness slider should be visible for active light
        const brightnessLabel = await screen.findByText(/Яркость: 75%/i);
        expect(brightnessLabel).toBeInTheDocument();
    });
});
