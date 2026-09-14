import { renderWidgetView } from './WidgetViews'
import { loadWidgetData } from './data'
import { syncStatusBarNotification } from '../lib/notifications'

// Android runs this headlessly whenever a widget is added, resized, or due for
// an update — the app itself may not be running.
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  if (widgetAction === 'WIDGET_DELETED') return

  const data = await loadWidgetData()
  renderWidget(renderWidgetView(widgetInfo.widgetName, data))

  // the system just woke us anyway; keep the status bar reading in step
  await syncStatusBarNotification(data).catch(() => {})
}

export default widgetTaskHandler
