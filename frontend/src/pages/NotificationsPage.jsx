import React from 'react'
import { FiBell, FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'

export default function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      type: 'success',
      title: 'Tally Connected',
      message: 'Successfully connected to Tally ERP at localhost:9000',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'info',
      title: 'Data Synced',
      message: 'Dashboard data has been refreshed from Tally',
      time: '5 minutes ago',
      read: false
    },
    {
      id: 3,
      type: 'warning',
      title: 'Backup Recommended',
      message: 'Consider uploading a backup file for offline access',
      time: '1 hour ago',
      read: true
    },
    {
      id: 4,
      type: 'info',
      title: 'Welcome to TallyDash Pro',
      message: 'Explore 20 advanced dashboards for your business analytics',
      time: '1 day ago',
      read: true
    }
  ]

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <FiAlertCircle className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <FiAlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <FiInfo className="w-5 h-5 text-blue-500" />
    }
  }

  const getBgColor = (type, read) => {
    if (read) return 'bg-gray-50'
    switch (type) {
      case 'success':
        return 'bg-green-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'error':
        return 'bg-red-50'
      default:
        return 'bg-blue-50'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FiBell className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Stay updated with your Tally activities</p>
          </div>
        </div>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Mark all as read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`${getBgColor(notification.type, notification.read)} rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div>
                  <h3 className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {notification.time}
                  </p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12">
          <FiBell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No notifications</h3>
          <p className="text-gray-500">You're all caught up!</p>
        </div>
      )}
    </div>
  )
}

