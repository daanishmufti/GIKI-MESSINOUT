import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create a client with the user's token to verify their identity
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { 
        headers: { Authorization: authHeader } 
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      throw new Error('Unauthorized')
    }

    console.log('Authenticated user:', user.email)

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      console.error('Role check error:', roleError)
      throw new Error('Only admins can perform this action')
    }

    const { action, targetUserId, newPassword, isIn, date } = await req.json()

    console.log(`Admin ${user.email} performing action: ${action} on user: ${targetUserId}`)

    switch (action) {
      case 'delete_user': {
        // Delete user from auth (this will cascade to profiles due to trigger)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_password': {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password: newPassword
        })
        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_attendance': {
        const targetDate = date || new Date().toISOString().split('T')[0]
        
        // Check if record exists
        const { data: existing } = await supabaseAdmin
          .from('daily_attendance')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('date', targetDate)
          .maybeSingle()

        if (existing) {
          const { error } = await supabaseAdmin
            .from('daily_attendance')
            .update({ is_in: isIn, marked_at: new Date().toISOString() })
            .eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await supabaseAdmin
            .from('daily_attendance')
            .insert({
              user_id: targetUserId,
              date: targetDate,
              is_in: isIn
            })
          if (error) throw error
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
