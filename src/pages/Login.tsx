import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

const Login = () => (
  <div className="flex flex-col items-center justify-center pt-12">
    <Logo className="w-64 mb-8" />
    <div className="w-full max-w-sm">
      <Auth
        supabaseClient={supabase}
        appearance={{ 
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: 'hsl(var(--primary))',
                brandAccent: 'hsl(var(--primary))',
              },
            },
          },
        }}
        providers={[]}
        theme="light"
      />
    </div>
  </div>
);

export default Login;