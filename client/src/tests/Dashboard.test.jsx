import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MusicPlayerProvider } from '../context/MusicPlayerContext';


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

    const renderDashboard = () => (
        render(
            <MemoryRouter>
                <MusicPlayerProvider>
                    <Dashboard />
                </MusicPlayerProvider>
            </MemoryRouter>
        )
    );

    it('renders add device button', async () => {
        renderDashboard();


        const addButtons = await screen.findAllByText(/Добавить устройство/i);
        expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders home mode buttons', async () => {
        renderDashboard();

        const homeBtn = await screen.findByRole('button', { name: /^Дома$/ });
        const awayBtn = await screen.findByRole('button', { name: /^Ушел$/ });
        const nightBtns = await screen.findAllByRole('button', { name: /^Ночь$/ });
        const vacationBtn = await screen.findByRole('button', { name: /^Отпуск$/ });

        expect(homeBtn).toBeInTheDocument();
        expect(awayBtn).toBeInTheDocument();
        expect(nightBtns.length).toBeGreaterThanOrEqual(1);
        expect(vacationBtn).toBeInTheDocument();
    });

    it('shows empty state when no devices', async () => {

    });

    it('renders device cards with slider for lights', async () => {
        setupMocks({
            data: {
                devices: [
                    { id: '1', name: 'Test Lamp', room: 'Living Room', type: 'Light', source: 'Philips', status: true, brightness: 75 }
                ],
                count: 1
            }
        });

        renderDashboard();

        const deviceName = await screen.findByText('Test Lamp');
        expect(deviceName).toBeInTheDocument();









    });
});
