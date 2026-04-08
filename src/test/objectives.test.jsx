import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

vi.mock('../config/api', () => ({ apiFetch: vi.fn().mockResolvedValue([]) }));
vi.mock('../styles/designSystem', () => ({ DS: {}, P: '#FF7E5F', P2: '#FEB47B', TXT: '#4A3428', TXT3: '#C8B8A8', R_SM: 8, R_MD: 12, R_FULL: 999, SH_SM: '', card: () => ({}), cardSm: () => ({}) }));
vi.mock('../hooks', () => ({ useIsMobile: () => false, useToast: () => [null, () => {}] }));
vi.mock('../utils/scoring', () => ({ fmtDate: (d) => d }));
vi.mock('../components/ui', () => ({
  Btn: (p) => React.createElement('button', null, p.children),
  Input: () => React.createElement('input'),
  Textarea: () => React.createElement('textarea'),
  Card: (p) => React.createElement('div', null, p.children),
  Modal: (p) => React.createElement('div', null, p.children),
  Spinner: () => React.createElement('span'),
  ProgBar: () => React.createElement('div'),
}));

import { ObjectiveBanner } from '../components/gamification/Objectives';
import { apiFetch } from '../config/api';

describe('ObjectiveBanner', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('recharge les objectifs quand refreshTick change', async () => {
    const { rerender } = render(React.createElement(ObjectiveBanner, { userId: 'u1', refreshTick: 0 }));
    expect(apiFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender(React.createElement(ObjectiveBanner, { userId: 'u1', refreshTick: 1 }));
    });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
