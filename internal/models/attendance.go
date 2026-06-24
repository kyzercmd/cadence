package models

import "time"

type AttendanceEntry struct {
	ID           string     `json:"id"`
	UserID       string     `json:"userId"`
	Date         time.Time  `json:"date"`
	ClockIn      *time.Time `json:"clockIn,omitempty"`
	ClockOut     *time.Time `json:"clockOut,omitempty"`
	TotalMinutes int        `json:"totalMinutes"`
}

type EmployeeLatestAttendance struct {
	UserID       string     `json:"userId"`
	Name         string     `json:"name"`
	AvatarURL    string     `json:"avatar_url"`
	Role         Role       `json:"role"`
	Position     string     `json:"position"`
	LastDate     *time.Time `json:"lastUpdate,omitempty"`
	TotalMinutes *int64     `json:"totalMinutes,omitempty"`
}

type LeaveRequest struct {
	ID              string      `json:"id"`
	UserID          string      `json:"userId"`
	Type            LeaveType   `json:"type"`
	StartDate       time.Time   `json:"startDate"`
	EndDate         time.Time   `json:"endDate"`
	Reason          string      `json:"reason"`
	Status          LeaveStatus `json:"status"`
	ReviewerID      *string     `json:"reviewerId,omitempty"`
	ReviewerComment *string     `json:"reviewerComment,omitempty"`
	CreatedAt       time.Time   `json:"createdAt"`
}

type CreateLeavePayload struct {
	Type      LeaveType `json:"type"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	Reason    string    `json:"reason"`
}

type ReviewLeavePayload struct {
	Status          LeaveStatus `json:"status"`
	ReviewerComment *string     `json:"reviewerComment"`
}

type LeaveRequestWithUser struct {
	LeaveRequest
	UserName  string `json:"userName"`
	AvatarURL string `json:"avatarUrl"`
}
