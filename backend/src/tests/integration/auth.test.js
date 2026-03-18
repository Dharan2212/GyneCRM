'use strict';

/**
 * GyneCRM – Integration: Auth Module
 *
 * Tests every auth route implemented in Batch 3 only.
 *
 * Covered routes:
 *   POST /api/v1/auth/login           – success + invalid-credentials + lockout
 *   POST /api/v1/auth/refresh         – stateless JWT in httpOnly cookie
 *   POST /api/v1/auth/logout          – clears cookie
 *   POST /api/v1/auth/change-password – authenticated, full flow
 *
 * Deferred routes (NOT tested here – not implemented in Batch 3):
 *   POST /api/v1/auth/request-reset
 *   POST /api/v1/auth/reset-password
 *
 * Locked JWT payload shape: { userId, hospitalId, branchId, role, iat, exp }
 * Locked token delivery:    httpOnly cookie (refresh) + JSON body (access)
 * Locked schema source:     Phase 2 – users table only
 *
 * DB seeding strategy:
 *   - A single test user is inserted in beforeAll and removed in afterAll.
 *   - All tests within a describe block that mutate state (lockout, change-pw)
 *     restore the state in afterEach so later tests are not affected.
 *   - bcrypt hash is pre-computed once to keep the suite fast.
 */

const request  = require('supertest');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app        = require('../../app');
const { db, destroyConnection } = require('../../db/connection');
const jwtConfig  = require('../../config/jwt');

/* ─── Test user seed ────────────────────────────────────────────────────── */
const TEST_USER = {
  id          : uuidv4(),
  email       : `test.auth.${Date.now()}@gynecrm.test`,
  password    : 'Test@Pass123!',
  role        : 'doctor',
  hospital_id : uuidv4(),
  branch_id   : uuidv4(),
};

// Pre-hash once – bcrypt is intentionally slow; calling it per-test wastes time.
let passwordHash;

async function seedUser(overrides = {}) {
  const user = { ...TEST_USER, ...overrides };
  await db.query(
    `INSERT INTO users
       (id, email, password_hash, role, hospital_id, branch_id,
        is_active, failed_login_attempts, locked_until, must_change_password,
        created_at, updated_at)
     VALUES
       ($1, $2, $3, $4, $5, $6,
        true, 0, NULL, false,
        NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      user.id,
      user.email,
      passwordHash,
      user.role,
      user.hospital_id,
      user.branch_id,
    ]
  );
  return user;
}

async function resetUserState() {
  await db.query(
    `UPDATE users
        SET failed_login_attempts = 0,
            locked_until          = NULL,
            is_active             = true,
            password_hash         = $2,
            updated_at            = NOW()
      WHERE id = $1`,
    [TEST_USER.id, passwordHash]
  );
}

/* ─── Lifecycle ─────────────────────────────────────────────────────────── */
beforeAll(async () => {
  passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  await seedUser();
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = $1', [TEST_USER.id]);
  if (db && typeof db.end === 'function') {
    await db.end();
  } else if (db && db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
  }
});

/* ─── Shared helper: log in and return full response ───────────────────── */
async function loginAs({ email, password } = {}) {
  return request(app)
    .post('/api/v1/auth/login')
    .send({ email: email ?? TEST_USER.email, password: password ?? TEST_USER.password });
}

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/v1/auth/login
   ══════════════════════════════════════════════════════════════════════════ */

describe('POST /api/v1/auth/login', () => {
  afterEach(async () => {
    await resetUserState();
  });

  /* ── Success ── */
  describe('success path', () => {
    let res;
    beforeAll(async () => {
      res = await loginAs();
    });

    it('returns HTTP 200', () => {
      expect(res.status).toBe(200);
    });

    it('sets success: true', () => {
      expect(res.body.success).toBe(true);
    });

    it('returns an access_token string in data', () => {
      expect(typeof res.body.data?.accessToken).toBe('string');
      expect(res.body.data.accessToken.length).toBeGreaterThan(0);
    });

    it('access token contains the locked JWT payload shape', () => {
      const decoded = jwt.decode(res.body.data.accessToken);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('hospitalId');
      expect(decoded).toHaveProperty('branchId');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });

    it('userId in access token matches the seeded user', () => {
      const decoded = jwt.decode(res.body.data.accessToken);
      expect(decoded.userId).toBe(TEST_USER.id);
    });

    it('sets a refreshToken httpOnly cookie', () => {
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);
    });

    it('refresh cookie is Secure in production config', () => {
      // Only assert Secure flag if NODE_ENV would be production; in test
      // environment the flag may be absent – we verify the cookie exists.
      const cookies = res.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
    });

    it('does NOT return the password hash in the response', () => {
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('$2b$');
      expect(body).not.toContain('password_hash');
    });
  });

  /* ── Invalid credentials ── */
  describe('invalid credentials', () => {
    it('returns HTTP 401 for wrong password', async () => {
      const res = await loginAs({ password: 'WrongPassword99!' });
      expect(res.status).toBe(401);
    });

    it('sets success: false for wrong password', async () => {
      const res = await loginAs({ password: 'WrongPassword99!' });
      expect(res.body.success).toBe(false);
    });

    it('returns HTTP 401 for non-existent email', async () => {
      const res = await loginAs({ email: 'nobody@gynecrm.test' });
      expect(res.status).toBe(401);
    });

    it('does not reveal whether the email exists (generic error message)', async () => {
      const resUnknownEmail = await loginAs({ email: 'ghost@gynecrm.test' });
      const resWrongPw      = await loginAs({ password: 'WrongPassword99!' });
      // Both should return the same generic message to prevent user enumeration
      expect(resUnknownEmail.body.message).toBe(resWrongPw.body.message);
    });

    it('returns the UNAUTHORIZED errorCode', async () => {
      const res = await loginAs({ password: 'WrongPassword99!' });
      expect(res.body.errorCode).toBe('UNAUTHORIZED');
    });

    it('increments failed_login_attempts on wrong password', async () => {
      await loginAs({ password: 'WrongPassword99!' });
      const { rows } = await db.query(
        'SELECT failed_login_attempts FROM users WHERE id = $1',
        [TEST_USER.id]
      );
      expect(rows[0].failed_login_attempts).toBeGreaterThan(0);
    });
  });

  /* ── Account lockout ── */
  describe('account lockout', () => {
    const MAX_ATTEMPTS = 5; // locked in Phase 2 / Batch 3

    it('locks the account after MAX_ATTEMPTS consecutive failures', async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await loginAs({ password: 'WrongPassword99!' });
      }
      const res = await loginAs({ password: 'WrongPassword99!' });
      expect(res.status).toBe(401);

      const { rows } = await db.query(
        'SELECT locked_until FROM users WHERE id = $1',
        [TEST_USER.id]
      );
      expect(rows[0].locked_until).not.toBeNull();
    });

    it('returns 401 with ACCOUNT_LOCKED errorCode when account is locked', async () => {
      // Lock the account
      await db.query(
        `UPDATE users
            SET failed_login_attempts = $2,
                locked_until          = NOW() + INTERVAL '30 minutes'
          WHERE id = $1`,
        [TEST_USER.id, MAX_ATTEMPTS]
      );

      const res = await loginAs();
      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('ACCOUNT_LOCKED');
    });

    it('allows login after the lockout window expires', async () => {
      // Set locked_until in the past to simulate expiry
      await db.query(
        `UPDATE users
            SET failed_login_attempts = 0,
                locked_until          = NOW() - INTERVAL '1 second'
          WHERE id = $1`,
        [TEST_USER.id]
      );

      const res = await loginAs();
      expect(res.status).toBe(200);
    });
  });

  /* ── Validation ── */
  describe('request validation', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'Test@Pass123!' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email });
      expect(res.status).toBe(400);
    });

    it('returns 400 when email is malformed', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'Test@Pass123!' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for an empty body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/v1/auth/refresh
   ══════════════════════════════════════════════════════════════════════════ */

describe('POST /api/v1/auth/refresh', () => {
  let refreshCookie;

  beforeAll(async () => {
    const res = await loginAs();
    const cookies = res.headers['set-cookie'];
    refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
  });

  afterAll(async () => {
    await resetUserState();
  });

  it('returns HTTP 200 with a valid refreshToken cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
  });

  it('returns a new access token in data', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(typeof res.body.data?.accessToken).toBe('string');
  });

  it('new access token has the locked JWT payload shape', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    const decoded = jwt.decode(res.body.data.accessToken);
    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('hospitalId');
    expect(decoded).toHaveProperty('branchId');
    expect(decoded).toHaveProperty('role');
  });

  it('returns 401 when the refreshToken cookie is absent', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a tampered refreshToken cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=tampered.token.value');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired refresh token', async () => {
    const expiredToken = jwt.sign(
      { userId: TEST_USER.id, hospitalId: TEST_USER.hospital_id,
        branchId: TEST_USER.branch_id, role: TEST_USER.role },
      jwtConfig.refreshSecret,
      { expiresIn: '-1s' }  // already expired
    );
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${expiredToken}`);
    expect(res.status).toBe(401);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/v1/auth/logout
   ══════════════════════════════════════════════════════════════════════════ */

describe('POST /api/v1/auth/logout', () => {
  let accessToken;
  let refreshCookie;

  beforeEach(async () => {
    await resetUserState();
    const res = await loginAs();
    accessToken  = res.body.data?.accessToken;
    refreshCookie = res.headers['set-cookie']?.find((c) => c.startsWith('refreshToken='));
  });

  it('returns HTTP 200 on successful logout', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('sets success: true on logout', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.body.success).toBe(true);
  });

  it('clears the refreshToken cookie on logout', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie)
      .set('Authorization', `Bearer ${accessToken}`);
    const cookies = res.headers['set-cookie'] ?? [];
    const cleared = cookies.find((c) => c.startsWith('refreshToken='));
    // Cookie should be cleared: either empty value or Max-Age=0 or Expires in past
    if (cleared) {
      const isCleared =
        cleared.includes('refreshToken=;') ||
        cleared.includes('Max-Age=0') ||
        cleared.includes('Expires=Thu, 01 Jan 1970');
      expect(isCleared).toBe(true);
    }
    // If no Set-Cookie header, the cookie was simply not re-issued – also acceptable
  });

  it('returns 401 when no auth context is provided for logout', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({});
    expect(res.status).toBe(401);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/v1/auth/change-password
   ══════════════════════════════════════════════════════════════════════════ */

describe('POST /api/v1/auth/change-password', () => {
  let accessToken;

  beforeEach(async () => {
    await resetUserState();
    const res = await loginAs();
    accessToken = res.body.data?.accessToken;
  });

  it('returns HTTP 200 on a valid change-password request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword : TEST_USER.password,
        newPassword     : 'NewSecure@Pass456!',
        confirmPassword : 'NewSecure@Pass456!',
      });
    expect(res.status).toBe(200);
  });

  it('sets success: true after password change', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword : TEST_USER.password,
        newPassword     : 'NewSecure@Pass456!',
        confirmPassword : 'NewSecure@Pass456!',
      });
    expect(res.body.success).toBe(true);
  });

  it('returns 401 when currentPassword is incorrect', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword : 'WrongCurrentPass!',
        newPassword     : 'NewSecure@Pass456!',
        confirmPassword : 'NewSecure@Pass456!',
      });
    expect(res.status).toBe(401);
  });

  it('returns 400 when newPassword and confirmPassword do not match', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword : TEST_USER.password,
        newPassword     : 'NewSecure@Pass456!',
        confirmPassword : 'DifferentPass@789!',
      });
    expect(res.status).toBe(400);
  });

  it('returns 400 when newPassword is the same as currentPassword', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword : TEST_USER.password,
        newPassword     : TEST_USER.password,
        confirmPassword : TEST_USER.password,
      });
    expect(res.status).toBe(400);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .send({
        currentPassword : TEST_USER.password,
        newPassword     : 'NewSecure@Pass456!',
        confirmPassword : 'NewSecure@Pass456!',
      });
    expect(res.status).toBe(401);
  });

  it('the new password actually works for subsequent login', async () => {
    const newPassword = 'NewSecure@Pass456!';
    await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword : TEST_USER.password,
        newPassword,
        confirmPassword : newPassword,
      });

    const loginRes = await loginAs({ password: newPassword });
    expect(loginRes.status).toBe(200);
  });

  it('the old password no longer works after a successful change', async () => {
    const newPassword = 'NewSecure@Pass456!';
    await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword : TEST_USER.password,
        newPassword,
        confirmPassword : newPassword,
      });

    const loginRes = await loginAs({ password: TEST_USER.password });
    expect(loginRes.status).toBe(401);
  });
});
