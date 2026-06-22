package models

type Role string

const (
	RoleAdmin    Role = "admin"
	RoleHR       Role = "HR"
	RoleEmployee Role = "employee"
)

type Level string

const (
	LevelJunior Level = "Junior"
	LevelMiddle Level = "Middle"
	LevelSenior Level = "Senior"
)

type Gender string

const (
	GenderMale   Gender = "Male"
	GenderFemale Gender = "Female"
)

type TaskStatus string

const (
	TaskStatusTodo       TaskStatus = "todo"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusInReview   TaskStatus = "in_review"
	TaskStatusDone       TaskStatus = "done"
)

type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

type ProjectStatus string

const (
	ProjectStatusActive    ProjectStatus = "active"
	ProjectStatusCompleted ProjectStatus = "completed"
)

type LeaveType string

const (
	LeaveTypeVacation LeaveType = "vacation"
	LeaveTypeSick     LeaveType = "sick"
	LeaveTypeRemote   LeaveType = "remote"
)

type LeaveStatus string

const (
	LeaveStatusPending  LeaveStatus = "pending"
	LeaveStatusApproved LeaveStatus = "approved"
	LeaveStatusRejected LeaveStatus = "rejected"
)
