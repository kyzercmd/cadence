package models

import "time"

type Project struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	Priority    Priority   `json:"priority"`
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
	DueDate     *time.Time `json:"dueDate"`
	ProjectName string     `json:"projectName"`
}

type CreateTaskPayload struct {
	Name          string     `json:"name"`
	Description   *string    `json:"description"`
	Priority      Priority   `json:"priority"`
	EstimateHours float64    `json:"estimateHours"`
	DueDate       *time.Time `json:"dueDate"`
	AssigneeIDs   []string   `json:"assigneeIds"`
	Attachments   []string   `json:"attachments"`
	Links         []string   `json:"links"`
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
	DueDate       *time.Time `json:"dueDate"`
	AssigneeIDs   []string   `json:"assigneeIds"`
	Attachments   []string   `json:"attachments"`
	Links         []string   `json:"links"`
}

type UpdateProjectPayload struct {
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Status      ProjectStatus `json:"status"`
	Priority    Priority      `json:"priority"`
	Deadline    *time.Time    `json:"deadline"`
	ImageURL    *string       `json:"imageUrl"`
}

type Assignee struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type BoardTaskResponse struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Status          TaskStatus `json:"status"`
	Priority        Priority   `json:"priority"`
	EstimateHours   float64    `json:"estimateHours"`
	TotalSpentHours float64    `json:"totalSpentHours"`
	DueDate         *time.Time `json:"dueDate"`
	Assignee        []Assignee `json:"assignees"`
}

type TaskDetailResponse struct {
	ID              string     `json:"id"`
	ProjectID       string     `json:"projectId"`
	Name            string     `json:"name"`
	Description     *string    `json:"description"`
	Status          TaskStatus `json:"status"`
	Priority        Priority   `json:"priority"`
	EstimateHours   float64    `json:"estimateHours"`
	TotalSpentHours float64    `json:"totalSpentHours"`
	DueDate         *time.Time `json:"dueDate"`
	Attachments     []string   `json:"attachments"`
	Links           []string   `json:"links"`
	Assignees       []Assignee `json:"assignees"`
}

type LogTimePayload struct {
	Hours float64 `json:"hours"`
}

type CreateProjectPayload struct {
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Priority    Priority   `json:"priority"`
	StartDate   *time.Time `json:"startDate,omitempty"`
	Deadline    *time.Time `json:"deadline,omitempty"`
	ImageURL    *string    `json:"imageUrl,omitempty"`
	MemberIDs   []string   `json:"memberIds"`
}

type GetProjectResponse struct {
	ID          string        `json:"id"`
	Code        string        `json:"code"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Status      ProjectStatus `json:"status"`
	Priority    Priority      `json:"priority"`
	MemberIDs   []string      `json:"memberIds"`
	CreatedAt   time.Time     `json:"createdAt"`
	StartDate   *time.Time    `json:"startDate,omitempty"`
	Deadline    *time.Time    `json:"deadline,omitempty"`
	ImageURL    *string       `json:"imageUrl,omitempty"`
}
