import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Brand } from './brand';
import documentsArt from '@/assets/documents.jpg';

export function AuthForm({ recovery = false }: { recovery?: boolean }) {
 const navigate = useNavigate();
 const [mode,setMode] = useState<'login'|'signup'|'forgot'>('login');
 const [name,setName] = useState(''); const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
 const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [notice,setNotice] = useState(''); const [recoveryReady,setRecoveryReady] = useState(false);
 useEffect(() => {
  async function initialize() {
   if (!recovery) { const {data} = await supabase.auth.getUser(); if(data.user) navigate({to:'/painel'}); return; }
   const params = new URLSearchParams(window.location.hash.slice(1));
   if (params.get('type') === 'recovery') {
    const access_token = params.get('access_token'); const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
     const {error} = await supabase.auth.setSession({access_token,refresh_token});
     if (error) { setError('O link expirou. Solicite uma nova recuperação de senha.'); return; }
     sessionStorage.setItem('finance-recovery','1');
     window.history.replaceState(null, '', '/reset-password');
    }
   }
   const {data} = await supabase.auth.getUser();
   setRecoveryReady(Boolean(data.user) && sessionStorage.getItem('finance-recovery') === '1');
  }
  initialize();
 },[recovery,navigate]);
 async function submit(e:FormEvent) { e.preventDefault(); setBusy(true);setError('');setNotice(''); try {
  if(recovery) { if(!recoveryReady) throw new Error('O link de recuperação é inválido ou expirou. Solicite um novo link.'); const {error} = await supabase.auth.updateUser({password}); if(error) throw error; sessionStorage.removeItem('finance-recovery');setNotice('Senha atualizada. Você já pode acessar sua conta.'); }
  else if(mode==='forgot') { const {error} = await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});if(error) throw error;setNotice('Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.'); }
  else if(mode==='signup') { const {data,error} = await supabase.auth.signUp({email,password,options:{data:{name},emailRedirectTo:window.location.origin}});if(error) throw error; if(data.session) await navigate({to:'/painel'}); else setNotice('Conta criada! Confira seu e-mail para confirmar o cadastro antes de entrar.'); }
  else { const {error} = await supabase.auth.signInWithPassword({email,password});if(error) throw error;await navigate({to:'/painel'}); }
 } catch(err) { const message = err instanceof Error ? err.message : ''; setError(message.includes('Invalid login') ? 'E-mail ou senha incorretos.' : message.includes('Email not confirmed') ? 'Confirme seu e-mail antes de entrar.' : message.includes('rate limit') ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' : message || 'Não foi possível concluir. Tente novamente.'); } finally {setBusy(false);} }
 async function google() {setBusy(true);setError('');try {const result = await lovable.auth.signInWithOAuth('google',{redirect_uri:window.location.origin});if(result.error) throw result.error;if(!result.redirected) await navigate({to:'/painel'});}catch {setError('Não foi possível entrar com Google. Tente novamente.');}finally{setBusy(false);}}
 const title = recovery ? 'Crie uma nova senha' : mode==='signup' ? 'Comece sua organização' : mode==='forgot' ? 'Recuperar sua senha' : 'Bem-vinda de volta';
 return <main className="auth-page"><aside className="auth-brand-side"><Brand/><div><img className="auth-art" src={documentsArt} width={1152} height={576} alt="Pasta e documentos organizados"/><h2>Mais tranquilidade.<br/>Tudo no seu lugar.</h2><p>Suas finanças, os documentos da casa e os cuidados com a Rebeca, reunidos em um só lugar.</p></div><p className="flex items-center gap-2"><LockKeyhole size={14}/> Seus dados são pessoais. E continuam assim.</p></aside><section className="auth-form-side"><div className="auth-form"><div className="eyebrow">MEU FINANCEIRO IA</div><h1>{title}</h1><p className="subtitle">{recovery?'Escolha uma senha segura para sua conta.':mode==='signup'?'Um novo começo para sua vida financeira.':mode==='forgot'?'Enviaremos um link de recuperação para seu e-mail.':'Entre para cuidar do que importa.'}</p>{!recovery && mode!=='forgot' && <><Button variant="outline" className="w-full mt-7 h-11" onClick={google} disabled={busy}><span className="font-bold">G</span> Continuar com Google</Button><div className="auth-divider">ou use seu e-mail</div></>}<form onSubmit={submit}>{mode==='signup'&&!recovery&&<div className="field"><label htmlFor="name">Seu nome</label><input id="name" value={name} onChange={e=>setName(e.target.value)} required autoComplete="name" placeholder="Como podemos chamar você?"/></div>}{!recovery&&<div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="voce@exemplo.com"/></div>}{(recovery||mode!=='forgot')&&<div className="field"><label htmlFor="password">{recovery?'Nova senha':'Senha'}</label><input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==='login'&&!recovery?'current-password':'new-password'} placeholder="Pelo menos 8 caracteres"/></div>}{mode==='login'&&!recovery&&<div className="text-right mt-2"><Button type="button" variant="link" size="sm" onClick={()=>{setMode('forgot');setError('');setNotice('');}}>Esqueci minha senha</Button></div>}{error&&<div role="alert" className="inline-error">{error}</div>}{notice&&<div role="status" className="inline-notice"><Mail size={17} className="mb-2"/>{notice}</div>}<Button className="w-full h-11 mt-6" disabled={busy}>{busy?'Aguarde…':recovery?'Salvar nova senha':mode==='signup'?'Criar minha conta':mode==='forgot'?'Enviar link de recuperação':'Entrar na minha conta'}<ArrowRight size={16}/></Button></form><div className="mt-6 text-center text-xs text-muted-foreground">{recovery?<Button variant="link" onClick={()=>navigate({to:'/auth'})}>Voltar para entrar</Button>:<>{mode==='login'?'Ainda não tem uma conta? ':mode==='signup'?'Já tem uma conta? ':''}<Button variant="link" size="sm" onClick={()=>{setMode(mode==='login'?'signup':'login');setNotice('');setError('');}}>{mode==='login'?'Criar conta':'Voltar para entrar'}</Button></>}</div><div className="footer-note"><LockKeyhole size={12}/> Acesso privado e documentos protegidos</div></div></section></main>;
}