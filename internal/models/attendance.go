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
