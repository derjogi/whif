import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import { createServerClient } from '@supabase/ssr'
import { redirect, type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks';

const supabaseHandle: Handle = async ({ event, resolve }) => {
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return event.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          event.cookies.set(name, value, { ...options, path: '/' })
        )
      },
    },
  })

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  const safeGetSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { session: null, user: null }
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      // JWT validation has failed
      return { session: null, user: null }
    }

    return { session, user }
  }

	// Add Supabase client and session to locals
	event.locals.supabase = supabase;
	event.locals.safeGetSession = safeGetSession;

	// Handle auth callback
	if (event.url.pathname.startsWith('/auth/callback')) {
		const code = event.url.searchParams.get('code');
		if (code) {
			await supabase.auth.exchangeCodeForSession(code);
		}
	}

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession()
	event.locals.session = session
	event.locals.user = user
  
  // Ensure JWT is properly set for database operations
  if (session?.access_token) {
    await event.locals.supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token!
    });
  }
  if (!event.locals.session && event.url.pathname != '/') {
    redirect(303, '/auth')
  }
  if (event.locals.session && event.url.pathname === '/auth') {
    redirect(303, '/')
  }
  return resolve(event)
}

export const handle: Handle = sequence(supabaseHandle, authGuard)
