import { Redirect } from 'expo-router';

export default function Index() {
  console.log('[Index] Redirecionando para /(auth)/login');
  return <Redirect href="/(auth)/login" />;
}
