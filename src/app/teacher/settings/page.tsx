'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { MoreHorizontal, Calendar, Clock, MapPin, UserCircle } from 'lucide-react'

// Example user - would come from auth context in a real app
const currentUser = {
  id: 'user-123',
  name: '佐藤 太郎',
  role: 'student', // or 'teacher'
}

// Types
interface User {
  id: string
  name: string
  role: 'student' | 'teacher'
}

interface RelocationRequest {
  id: string
  lessonTitle: string
  subject: string
  originalDate: string
  originalStartTime: string
  originalEndTime: string
  originalLocation: string
  requestedDate: string
  requestedStartTime: string
  requestedEndTime: string
  requestedLocation: string
  reason: string
  status: 'pending' | 'approved' | 'denied'
  requestedBy: User
  requestedTo: User
  createdAt: string
}

// Mock data
const mockRequests: RelocationRequest[] = [
  {
    id: 'req-001',
    lessonTitle: '化学基礎',
    subject: 'chemistry',
    originalDate: '2025-04-10T09:00:00',
    originalStartTime: '09:00',
    originalEndTime: '10:30',
    originalLocation: 'A102',
    requestedDate: '2025-04-12T09:00:00',
    requestedStartTime: '09:00',
    requestedEndTime: '10:30',
    requestedLocation: 'A102',
    reason: '部活動の試合があるため',
    status: 'pending',
    requestedBy: {
      id: 'user-123',
      name: '佐藤 太郎',
      role: 'student',
    },
    requestedTo: {
      id: 'teacher-001',
      name: '田中 先生',
      role: 'teacher',
    },
    createdAt: '2025-04-07T14:30:00',
  },
  {
    id: 'req-002',
    lessonTitle: '英語リーディング',
    subject: 'english',
    originalDate: '2025-04-09T13:00:00',
    originalStartTime: '13:00',
    originalEndTime: '14:30',
    originalLocation: 'B201',
    requestedDate: '2025-04-11T15:00:00',
    requestedStartTime: '15:00',
    requestedEndTime: '16:30',
    requestedLocation: 'B201',
    reason: '学校行事のため',
    status: 'pending',
    requestedBy: {
      id: 'teacher-002',
      name: '鈴木 先生',
      role: 'teacher',
    },
    requestedTo: {
      id: 'user-123',
      name: '佐藤 太郎',
      role: 'student',
    },
    createdAt: '2025-04-06T10:15:00',
  },
  {
    id: 'req-003',
    lessonTitle: '数学II',
    subject: 'math',
    originalDate: '2025-04-05T10:45:00',
    originalStartTime: '10:45',
    originalEndTime: '12:15',
    originalLocation: 'C301',
    requestedDate: '2025-04-06T10:45:00',
    requestedStartTime: '10:45',
    requestedEndTime: '12:15',
    requestedLocation: 'C301',
    reason: '教師の都合により',
    status: 'approved',
    requestedBy: {
      id: 'teacher-003',
      name: '山田 先生',
      role: 'teacher',
    },
    requestedTo: {
      id: 'user-123',
      name: '佐藤 太郎',
      role: 'student',
    },
    createdAt: '2025-04-01T09:30:00',
  },
  {
    id: 'req-004',
    lessonTitle: '物理',
    subject: 'physics',
    originalDate: '2025-04-03T14:30:00',
    originalStartTime: '14:30',
    originalEndTime: '16:00',
    originalLocation: 'D401',
    requestedDate: '2025-04-04T14:30:00',
    requestedStartTime: '14:30',
    requestedEndTime: '16:00',
    requestedLocation: 'D402',
    reason: '教室の設備の問題のため',
    status: 'denied',
    requestedBy: {
      id: 'user-123',
      name: '佐藤 太郎',
      role: 'student',
    },
    requestedTo: {
      id: 'teacher-004',
      name: '木村 先生',
      role: 'teacher',
    },
    createdAt: '2025-03-31T16:45:00',
  },
]

// Main component
export default function RelocationRequestsPage() {
  const [requests, setRequests] = useState<RelocationRequest[]>(mockRequests)
  const [activeTab, setActiveTab] = useState('pending')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RelocationRequest | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  
  // Filter requests based on tab and user role
  const pendingRequests = requests.filter(req => req.status === 'pending')
  const historyRequests = requests.filter(req => req.status !== 'pending')
  
  // Edit request state
  const [editFormData, setEditFormData] = useState({
    requestedDate: '',
    requestedStartTime: '',
    requestedEndTime: '',
    requestedLocation: '',
    reason: '',
  })
  
  // Handle opening edit modal
  const handleEditRequest = (request: RelocationRequest) => {
    setSelectedRequest(request)
    setEditFormData({
      requestedDate: request.requestedDate,
      requestedStartTime: request.requestedStartTime,
      requestedEndTime: request.requestedEndTime,
      requestedLocation: request.requestedLocation,
      reason: request.reason,
    })
    setIsEditModalOpen(true)
  }
  
  // Handle opening view modal
  const handleViewRequest = (request: RelocationRequest) => {
    setSelectedRequest(request)
    setIsViewModalOpen(true)
  }
  
  // Handle opening delete confirmation
  const handleDeletePrompt = (request: RelocationRequest) => {
    setSelectedRequest(request)
    setIsDeleteConfirmOpen(true)
  }
  
  // Handle saving edited request
  const handleSaveRequest = () => {
    if (!selectedRequest) return
    
    const updatedRequests = requests.map(req => {
      if (req.id === selectedRequest.id) {
        return {
          ...req,
          requestedDate: editFormData.requestedDate,
          requestedStartTime: editFormData.requestedStartTime,
          requestedEndTime: editFormData.requestedEndTime,
          requestedLocation: editFormData.requestedLocation,
          reason: editFormData.reason,
        }
      }
      return req
    })
    
    setRequests(updatedRequests)
    setIsEditModalOpen(false)
  }
  
  // Handle deleting request
  const handleDeleteRequest = () => {
    if (!selectedRequest) return
    
    const updatedRequests = requests.filter(req => req.id !== selectedRequest.id)
    setRequests(updatedRequests)
    setIsDeleteConfirmOpen(false)
  }
  
  // Handle request status change
  const handleStatusChange = (requestId: string, newStatus: 'approved' | 'denied') => {
    const updatedRequests = requests.map(req => {
      if (req.id === requestId) {
        return { ...req, status: newStatus }
      }
      return req
    })
    
    setRequests(updatedRequests)
  }
  
  // List of available rooms
  const rooms = ['A101', 'A102', 'B201', 'B202', 'C301', 'C302', 'D401', 'D402']
  
  // Generate time options from 8:00 to 18:00 with 15-minute intervals
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 8; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`)
      if (hour < 18) {
        times.push(`${hour.toString().padStart(2, '0')}:15`)
        times.push(`${hour.toString().padStart(2, '0')}:30`)
        times.push(`${hour.toString().padStart(2, '0')}:45`)
      }
    }
    return times
  }
  
  const timeOptions = generateTimeOptions()
  
  // Generate date options for next 30 days
  const generateDateOptions = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    
    return dates
  }
  
  const dateOptions = generateDateOptions()
  
  // Get color based on subject
  const getSubjectColor = (subject: string) => {
    const subjectColors: Record<string, string> = {
      math: 'bg-blue-500',
      english: 'bg-green-500',
      physics: 'bg-red-500',
      chemistry: 'bg-yellow-500',
    }
    return subjectColors[subject] || 'bg-gray-500'
  }
  
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500 hover:bg-yellow-600',
      approved: 'bg-green-500 hover:bg-green-600',
      denied: 'bg-red-500 hover:bg-red-600',
    }
    return statusColors[status] || 'bg-gray-500 hover:bg-gray-600'
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年M月d日 (eee)', { locale: ja })
  }
  
  // Check if request is from current user
  const isFromCurrentUser = (request: RelocationRequest) => {
    return request.requestedBy.id === currentUser.id
  }
  
  // Render request card
  const renderRequestCard = (request: RelocationRequest) => {
    const isFromMe = isFromCurrentUser(request)
    
    return (
      <Card key={request.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${getSubjectColor(request.subject)}`} />
              {request.lessonTitle}
              <Badge 
                className={`ml-2 ${getStatusBadgeColor(request.status)}`}
              >
                {request.status === 'pending' ? '検討中' : 
                  request.status === 'approved' ? '承認済み' : '拒否済み'}
              </Badge>
            </CardTitle>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewRequest(request)}>
                  詳細を見る
                </DropdownMenuItem>
                
                {request.status === 'pending' && isFromMe && (
                  <DropdownMenuItem onClick={() => handleEditRequest(request)}>
                    編集する
                  </DropdownMenuItem>
                )}
                
                {request.status === 'pending' && isFromMe && (
                  <DropdownMenuItem 
                    onClick={() => handleDeletePrompt(request)}
                    className="text-red-600"
                  >
                    削除する
                  </DropdownMenuItem>
                )}
                
                {request.status === 'pending' && !isFromMe && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange(request.id, 'approved')}
                      className="text-green-600"
                    >
                      承認する
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange(request.id, 'denied')}
                      className="text-red-600"
                    >
                      拒否する
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="text-sm text-muted-foreground mb-3">
            {isFromMe ? 
              `${request.requestedTo.name}へリクエスト` : 
              `${request.requestedBy.name}からリクエスト`}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>変更前: {formatDate(request.originalDate)}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>変更後: {formatDate(request.requestedDate)}</span>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>
                {request.originalStartTime} 〜 {request.originalEndTime}
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>
                {request.requestedStartTime} 〜 {request.requestedEndTime}
              </span>
            </div>
            
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>教室: {request.originalLocation}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>教室: {request.requestedLocation}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">移動リクエスト</h1>
      
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">保留中 ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="history">履歴 ({historyRequests.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length > 0 ? (
            pendingRequests.map(request => renderRequestCard(request))
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              保留中のリクエストはありません
            </p>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          {historyRequests.length > 0 ? (
            historyRequests.map(request => renderRequestCard(request))
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              履歴はありません
            </p>
          )}
        </TabsContent>
      </Tabs>
      
      {/* View Request Modal */}
      {selectedRequest && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center">
                <div 
                  className={`w-4 h-4 rounded-full mr-2 ${getSubjectColor(selectedRequest.subject)}`}
                />
                {selectedRequest.lessonTitle} - リクエスト詳細
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2 mb-4">
                <Badge className={getStatusBadgeColor(selectedRequest.status)}>
                  {selectedRequest.status === 'pending' ? '検討中' : 
                    selectedRequest.status === 'approved' ? '承認済み' : '拒否済み'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.createdAt), 'yyyy/MM/dd HH:mm')}に作成
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="font-medium">リクエスト者:</div>
                <div className="col-span-2 flex items-center">
                  <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  {selectedRequest.requestedBy.name}
                  <Badge variant="outline" className="ml-2">
                    {selectedRequest.requestedBy.role === 'student' ? '生徒' : '教師'}
                  </Badge>
                </div>
                
                <div className="font-medium">リクエスト先:</div>
                <div className="col-span-2 flex items-center">
                  <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  {selectedRequest.requestedTo.name}
                  <Badge variant="outline" className="ml-2">
                    {selectedRequest.requestedTo.role === 'student' ? '生徒' : '教師'}
                  </Badge>
                </div>
              </div>
              
              <div className="border-t pt-3">
                <h4 className="font-medium mb-2">変更詳細:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">元の予定:</h5>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDate(selectedRequest.originalDate)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        {selectedRequest.originalStartTime} 〜 {selectedRequest.originalEndTime}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        教室: {selectedRequest.originalLocation}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">希望変更:</h5>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDate(selectedRequest.requestedDate)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        {selectedRequest.requestedStartTime} 〜 {selectedRequest.requestedEndTime}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        教室: {selectedRequest.requestedLocation}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-1">理由:</h5>
                <p className="text-sm bg-muted p-3 rounded-md">{selectedRequest.reason}</p>
              </div>
            </div>
            
            <DialogFooter className="flex space-x-2 justify-end">
              {selectedRequest.status === 'pending' && !isFromCurrentUser(selectedRequest) && (
                <>
                  <Button 
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'approved')
                      setIsViewModalOpen(false)
                    }}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    承認する
                  </Button>
                  <Button 
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'denied')
                      setIsViewModalOpen(false)
                    }}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    拒否する
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Edit Request Modal */}
      {selectedRequest && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {selectedRequest.lessonTitle}のリクエスト編集
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <h4 className="mb-2 font-medium">日付選択:</h4>
                <Select 
                  value={editFormData.requestedDate} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, requestedDate: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {editFormData.requestedDate ? formatDate(editFormData.requestedDate) : "日付を選択"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((date) => (
                      <SelectItem key={date.toISOString()} value={date.toISOString()}>
                        {format(date, 'yyyy年M月d日 (eee)', { locale: ja })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="mb-2 font-medium">開始時間:</h4>
                  <Select 
                    value={editFormData.requestedStartTime} 
                    onValueChange={(value) => setEditFormData({ ...editFormData, requestedStartTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue>{editFormData.requestedStartTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={`start-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h4 className="mb-2 font-medium">終了時間:</h4>
                  <Select 
                    value={editFormData.requestedEndTime} 
                    onValueChange={
                      (value) => setEditFormData({ ...editFormData, requestedEndTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{editFormData.requestedEndTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={`end-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <h4 className="mb-2 font-medium">教室:</h4>
                <Select 
                  value={editFormData.requestedLocation} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, requestedLocation: value })}
                >
                  <SelectTrigger>
                    <SelectValue>{editFormData.requestedLocation}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(room => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h4 className="mb-2 font-medium">理由:</h4>
                <Textarea
                  value={editFormData.reason}
                  onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  placeholder="変更の理由を入力してください"
                  className="resize-none"
                />
              </div>
            </div>
            
            <DialogFooter className="flex space-x-2 justify-end">
              <Button onClick={handleSaveRequest}>
                保存
              </Button>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                キャンセル
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      {selectedRequest && (
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                リクエストを削除
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p>このリクエストを削除してもよろしいですか？この操作は元に戻せません。</p>
              <p className="font-medium mt-2">{selectedRequest.lessonTitle} - {formatDate(selectedRequest.requestedDate)}</p>
            </div>
            
            <DialogFooter className="flex space-x-2 justify-end">
              <Button 
                variant="destructive" 
                onClick={handleDeleteRequest}
              >
                削除する
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                キャンセル
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}