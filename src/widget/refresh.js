import { requestWidgetUpdate } from 'react-native-android-widget'
import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { renderWidgetView, WIDGET_NAMES } from './WidgetViews'
import { loadWidgetData } from './data'
import { syncStatusBarNotification } from '../lib/notifications'

export const BACKGROUND_TASK = 'wx-weather-refresh'

// Push freshly loaded data into every widget the user has on their home screen
export async function updateAllWidgets(data) {
  await Promise.all(
    WIDGET_NAMES.map(widgetName =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: () => renderWidgetView(widgetName, data),
      }).catch(() => {})
    )
  )
}

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    const data = await loadWidgetData({ force: true })
    await updateAllWidgets(data)
    await syncStatusBarNotification(data)
    return BackgroundTask.BackgroundTaskResult.Success
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

export async function registerBackgroundRefresh() {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)
    if (!registered) {
      // 15 minutes is the Android floor; the system may stretch it further
      await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, { minimumInterval: 15 })
    }
  } catch {
    // background work is a nice-to-have; widgets still refresh on their own schedule
  }
}
