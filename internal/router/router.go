package router

import (
	"net/http"

	"github.com/justinas/alice"
	_ "github.com/kyzercmd/cadence/docs"
	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/models"
)

type Handlers struct {
	Auth         *handler.AuthHandler
	User         *handler.UserHandler
	Task         *handler.TaskHandler
	Project      *handler.ProjectHandler
	Attendance   *handler.AttendanceHandler
	Leave        *handler.LeaveHandler
	Notification *handler.NotificationHandler
	Storage      *handler.StorageHandler
}

type Middlewares struct {
	Auth *middleware.AuthMiddleware
}

func SetupRoutes(h Handlers, m Middlewares) http.Handler {
	mux := http.NewServeMux()

	registerSwagger(mux)

	mapRoutes(mux, h, m)

	globalChain := alice.New(middleware.RecoverPanic, middleware.EnableCORS, middleware.RateLimiter, middleware.LimitBodySize, middleware.CommonHeaders)

	return globalChain.Then(mux)
}

func mapRoutes(mux *http.ServeMux, h Handlers, m Middlewares) {
	protectedChain := alice.New(m.Auth.RequireAuth)
	HRChain := protectedChain.Append(middleware.RequireRole(models.RoleHR, models.RoleAdmin))
	AdminChain := protectedChain.Append(middleware.RequireRole(models.RoleAdmin))

	//Auths
	mux.HandleFunc("POST /api/auth/login", h.Auth.Login)
	mux.HandleFunc("POST /api/auth/refresh", h.Auth.Refresh)

	//Search
	mux.Handle("GET /api/search", protectedChain.ThenFunc(h.User.GlobalSearch))

	//User & Employee
	mux.Handle("GET /api/users/me", protectedChain.ThenFunc(h.User.GetSelf))
	mux.Handle("PATCH /api/users/me", protectedChain.ThenFunc(h.User.UpdateSelf))
	mux.Handle("GET /api/users", HRChain.ThenFunc(h.User.GetAllEmployee))
	mux.Handle("GET /api/users/{targetid}", HRChain.ThenFunc(h.User.GetEmployee))
	mux.Handle("PATCH /api/users/{targetid}", HRChain.ThenFunc(h.User.HRUpdateEmployee))
	mux.Handle("POST /api/admin/employee", AdminChain.ThenFunc(h.User.CreateEmployee))
	mux.Handle("PATCH /api/admin/users/{targetid}", AdminChain.ThenFunc(h.User.AdminUpdateEmployee))

	//Attendance
	mux.Handle("POST /api/attendance/clock-in", protectedChain.ThenFunc(h.Attendance.ClockIn))
	mux.Handle("POST /api/attendance/clock-out", protectedChain.ThenFunc(h.Attendance.ClockOut))
	mux.Handle("GET /api/attendance/me", protectedChain.ThenFunc(h.Attendance.GetTodayAttendance))
	mux.Handle("GET /api/attendance/history", protectedChain.ThenFunc(h.Attendance.GetMyHistory))
	mux.Handle("GET /api/attendance/employees", HRChain.ThenFunc(h.Attendance.GetAllEmployeesAttendance))
	mux.Handle("GET /api/attendance/{targetid}/history", HRChain.ThenFunc(h.Attendance.GetEmployeeHistory))

	//Leave
	mux.Handle("POST /api/leave", protectedChain.ThenFunc(h.Leave.SubmitLeave))
	mux.Handle("GET /api/leave/me", protectedChain.ThenFunc(h.Leave.GetMyLeaves))
	mux.Handle("GET /api/leave/pending", HRChain.ThenFunc(h.Leave.GetPendingLeaves))
	mux.Handle("GET /api/leave/all", HRChain.ThenFunc(h.Leave.GetAllLeaves))
	mux.Handle("PATCH /api/leave/{leaveid}/review", HRChain.ThenFunc(h.Leave.ReviewLeave))

	//Project
	mux.Handle("GET /api/projects", protectedChain.ThenFunc(h.Project.GetProjects))
	mux.Handle("GET /api/projects/{projectid}", protectedChain.ThenFunc(h.Project.GetProjectByID))
	mux.Handle("POST /api/projects", HRChain.ThenFunc(h.Project.CreateProject))
	mux.Handle("PUT /api/projects/{projectid}", HRChain.ThenFunc(h.Project.UpdateProject))
	mux.Handle("DELETE /api/projects/{projectid}", HRChain.ThenFunc(h.Project.DeleteProject))

	//Task
	mux.Handle("POST /api/projects/{projectid}/tasks", protectedChain.ThenFunc(h.Task.CreateTask))
	mux.Handle("GET /api/projects/{projectid}/tasks", protectedChain.ThenFunc(h.Task.GetProjectTasks))
	mux.Handle("GET /api/users/me/tasks", protectedChain.ThenFunc(h.Task.GetMyTasks))
	mux.Handle("GET /api/tasks/{taskid}", protectedChain.ThenFunc(h.Task.GetTaskDetails))
	mux.Handle("PUT /api/tasks/{taskid}", protectedChain.ThenFunc(h.Task.UpdateTask))
	mux.Handle("PATCH /api/tasks/{taskid}/status", protectedChain.ThenFunc(h.Task.UpdateTaskStatus))
	mux.Handle("PATCH /api/tasks/{taskid}/time", protectedChain.ThenFunc(h.Task.LogTime))

	//Notification
	mux.Handle("GET /api/notifications", protectedChain.ThenFunc(h.Notification.GetMyNotifications))
	mux.Handle("PATCH /api/notifications/{notifid}/read", protectedChain.ThenFunc(h.Notification.MarkAsRead))
	mux.Handle("PATCH /api/notifications/read-all", protectedChain.ThenFunc(h.Notification.MarkAllAsRead))

	//Storage
	mux.Handle("POST /api/upload", protectedChain.ThenFunc(h.Storage.UploadFile))
}
