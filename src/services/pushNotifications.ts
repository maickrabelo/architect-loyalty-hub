import { Capacitor } from '@capacitor/core';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

const ANDROID_CHANNEL_ID = 'grupo-conexao-default';

function getNotificationRoute(notification: ActionPerformed | PushNotificationSchema): string | null {
  const data = 'notification' in notification ? notification.notification.data : notification.data;
  const route = data?.route;
  return typeof route === 'string' && route.startsWith('/') ? route : null;
}

export async function initializePushNotifications(userId: string): Promise<() => void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return () => undefined;

  const handles: PluginListenerHandle[] = [];

  try {
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: 'Grupo Conexão',
        description: 'Notificações importantes do programa de relacionamento',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#C48B72',
      });
    }

    handles.push(
      await PushNotifications.addListener('registration', async (token: Token) => {
        const platform: 'android' | 'ios' = Capacitor.getPlatform() === 'android' ? 'android' : 'ios';
        const { error } = await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            token: token.value,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' },
        );

        if (error) {
          console.error('Não foi possível salvar o token de push:', error);
        }
      }),
    );

    handles.push(
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Erro ao registrar notificações push:', error);
      }),
    );

    handles.push(
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        window.dispatchEvent(new CustomEvent('grupo-conexao:push-received', { detail: notification }));
      }),
    );

    handles.push(
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const route = getNotificationRoute(action);
        if (route) {
          window.dispatchEvent(new CustomEvent('grupo-conexao:push-route', { detail: { route } }));
        }
      }),
    );

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    } else {
      console.info('Permissão de notificações não concedida pelo usuário.');
    }
  } catch (error) {
    console.error('Falha ao inicializar notificações push:', error);
  }

  return () => {
    for (const handle of handles) {
      void handle.remove();
    }
  };
}
