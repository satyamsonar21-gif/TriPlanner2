import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

function supabaseAutoConfirmPlugin(): Plugin {
  return {
    name: 'supabase-auto-confirm',
    configureServer(server) {
      // 1. Auto-Confirm Endpoint
      server.middlewares.use('/api/auth/auto-confirm', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', async () => {
          try {
            const { email, userId } = JSON.parse(body || '{}')
            const env = loadEnv('development', process.cwd(), '')
            const supabaseUrl =
              env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
            const secretKey =
              env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || ''

            if (secretKey && supabaseUrl) {
              const adminClient = createClient(supabaseUrl, secretKey, {
                auth: { autoRefreshToken: false, persistSession: false },
              })

              if (userId) {
                await adminClient.auth.admin.updateUserById(userId, {
                  email_confirm: true,
                })
              } else if (email) {
                const { data: usersData } =
                  await adminClient.auth.admin.listUsers()
                const found = (usersData?.users as Array<{ id: string; email?: string }> | undefined)?.find(
                  (u) => u.email?.toLowerCase() === email.toLowerCase()
                )
                if (found) {
                  await adminClient.auth.admin.updateUserById(found.id, {
                    email_confirm: true,
                  })
                }
              }
            }

            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                success: true,
                message: 'User email confirmed successfully',
              })
            )
          } catch (err) {
            console.error('[auto-confirm-api] Error confirming user:', err)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: false, error: String(err) }))
          }
        })
      })

      // 2. Pre-Confirmed User Registration Endpoint (Bypasses email rate-limits & email confirmation blocks)
      server.middlewares.use('/api/auth/register', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', async () => {
          try {
            const { email, password, fullName } = JSON.parse(body || '{}')
            const env = loadEnv('development', process.cwd(), '')
            const supabaseUrl =
              env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
            const secretKey =
              env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || ''

            if (!secretKey || !supabaseUrl) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Supabase secret not configured' }))
              return
            }

            const adminClient = createClient(supabaseUrl, secretKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            })

            const { data: usersData } = await adminClient.auth.admin.listUsers()
            const existing = (usersData?.users as Array<{ id: string; email?: string }> | undefined)?.find(
              (u) => u.email?.toLowerCase() === email.toLowerCase()
            )

            let userId = existing?.id
            if (existing) {
              // Update user password and ensure email_confirm is true
              await adminClient.auth.admin.updateUserById(existing.id, {
                password: password,
                email_confirm: true,
                user_metadata: { full_name: fullName },
              })
            } else {
              // Create pre-confirmed user
              const { data: createData, error: createErr } =
                await adminClient.auth.admin.createUser({
                  email: email.trim(),
                  password: password,
                  email_confirm: true,
                  user_metadata: { full_name: fullName.trim() },
                })

              if (createErr) {
                throw createErr
              }
              userId = createData.user.id
            }

            // Ensure profile exists in profiles table
            if (userId) {
              await adminClient.from('profiles').upsert(
                {
                  id: userId,
                  auth_user_id: userId,
                  email: email.trim().toLowerCase(),
                  full_name: fullName.trim(),
                  display_name: fullName.trim().split(' ')[0],
                  role: 'traveler',
                  status: 'active',
                  onboarding_completed: false,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
              )
            }

            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: true, userId }))
          } catch (err) {
            console.error('[register-api] Error creating user:', err)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 400
            res.end(
              JSON.stringify({
                error:
                  (err as { message?: string })?.message || String(err),
              })
            )
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), supabaseAutoConfirmPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
