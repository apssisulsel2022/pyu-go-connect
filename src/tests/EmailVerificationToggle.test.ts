import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('Email Verification Toggle Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use standard signUp when email verification is required', async () => {
    // Mock settings to return verification required = true
    const mockMaybeSingle = vi.fn().mockResolvedValue({ 
      data: { value: { email_verification_required: true } }, 
      error: null 
    });
    
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    });

    (supabase.auth.signUp as any).mockResolvedValue({ data: { user: { id: '123' } }, error: null });

    const { signUp } = useAuth();
    await signUp('test@example.com', 'password123', 'Test User');

    // Should call standard signUp
    expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      password: 'password123',
    }));
    
    // Should NOT call the register-user Edge Function
    expect(supabase.functions.invoke).not.toHaveBeenCalledWith('register-user', expect.anything());
  });

  it('should use Edge Function when email verification is NOT required', async () => {
    // Mock settings to return verification required = false
    const mockMaybeSingle = vi.fn().mockResolvedValue({ 
      data: { value: { email_verification_required: false } }, 
      error: null 
    });
    
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    });

    (supabase.functions.invoke as any).mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: { session: {} }, error: null });

    const { signUp } = useAuth();
    await signUp('test@example.com', 'password123', 'Test User');

    // Should call the register-user Edge Function
    expect(supabase.functions.invoke).toHaveBeenCalledWith('register-user', expect.objectContaining({
      body: expect.objectContaining({
        email: 'test@example.com',
        fullName: 'Test User',
      }),
    }));
    
    // Should NOT call standard signUp
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
    
    // Should automatically sign in after registration
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should auto-confirm unconfirmed users during signIn if verification is disabled', async () => {
    // Mock settings to return verification required = false
    const mockMaybeSingle = vi.fn().mockResolvedValue({ 
      data: { value: { email_verification_required: false } }, 
      error: null 
    });
    
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    });

    // First attempt fails with "Email not confirmed"
    const firstAttempt = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'Email not confirmed' } })
      .mockResolvedValueOnce({ data: { session: {} }, error: null });
    
    (supabase.auth.signInWithPassword as any) = firstAttempt;
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });

    const { signIn } = useAuth();
    await signIn('test@example.com', 'password123');

    // Should have attempted confirm_by_email
    expect(supabase.functions.invoke).toHaveBeenCalledWith('register-user', expect.objectContaining({
      body: expect.objectContaining({
        action: 'confirm_by_email',
        email: 'test@example.com',
      }),
    }));
    
    // Should have retried signIn
    expect(firstAttempt).toHaveBeenCalledTimes(2);
  });
});
