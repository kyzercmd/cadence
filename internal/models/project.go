package models

import "time"

type Project struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	Priority    Priority   `json:"priority"`
	LeadID      string     `json:"leadId"`
	MemberIDs   []string   `json:"memberIds"`
	CreatedAt   time.Time  `json:"createdAt"`
	StartDate   *time.Time `json:"startDate,omitempty"`
	Deadline    *time.Time `json:"deadline,omitempty"`
	ImageURL    *string    `json:"imageUrl,omitempty"`
}

type Task struct {
	ID            string     `json:"id"`
	ProjectID     string     `json:"projectId"`
	Name          string     `json:"name"`
	Description   *string    `json:"description,omitempty"`
	Status        TaskStatus `json:"status"`
	Priority      Priority   `json:"priority"`
	AssigneeIDs   []string   `json:"assigneeIds,omitempty"`
	EstimateHours float64    `json:"estimateHours"`
	SpentHours    float64    `json:"spentHours"`
	DueDate       *time.Time `json:"dueDate,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	Attachments   []string   `json:"attachments,omitempty"`
	Links         []string   `json:"links,omitempty"`
}

type MyTaskResponse struct {
	ID          string     `json:"id"`
	TaskName    string     `json:"taskName"`
	Status      TaskStatus `json:"status"`
	Priority    Priority   `json:"priority"`
	DueDate     *string    `json:"dueDate"`
	ProjectName string     `json:"projectName"`
}

type CreateTaskPayload struct {
	Name          string   `json:"name"`
	Description   *string  `json:"description"`
	Priority      Priority `json:"priority"`
	EstimateHours float64  `json:"estimateHours"`
	DueDate       *string  `json:"dueDate"` // YYYY-MM-DD
	AssigneeIDs   []string `json:"assigneeIds"`
	Attachments   []string `json:"attachments"`
	Links         []string `json:"links"`
}

type UpdateTaskStatusPayload struct {
	Status TaskStatus `json:"status"`
}

type UpdateTaskPayload struct {
	Name          string     `json:"name"`
	Description   *string    `json:"description"`
	Status        TaskStatus `json:"status"`
	Priority      Priority   `json:"priority"`
	EstimateHours float64    `json:"estimateHours"`
	DueDate       *string    `json:"dueDate"` //YYYY-MM-DD
	AssigneeIDs   []string   `json:"assigneeIds"`
	Attachments   []string   `json:"attachments"`
	Links         []string   `json:"links"`
}
