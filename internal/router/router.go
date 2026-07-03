package router

import (
	"net/http"
	"os"

	"github.com/justinas/alice"
	_ "github.com/kyzercmd/cadence/docs"
	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/rs/cors"
	httpSwagger "github.com/swaggo/http-swagger"
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

	mux.Handle("/swagger/", httpSwagger.WrapHandler)

	mapAuthRoutes(mux, h, m)
	mapUserRoutes(mux, h, m)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{os.Getenv("FRONTEND_URL")},
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		Debug:            false,
	})

	handler := c.Handler(mux)

	return handler
}

func mapAuthRoutes(mux *http.ServeMux, h Handlers, m Middlewares) {
	mux.HandleFunc("POST /api/auth/login", h.Auth.Login)
	mux.HandleFunc("POST /api/auth/refresh", h.Auth.Refresh)
}

func mapUserRoutes(mux *http.ServeMux, h Handlers, m Middlewares) {
	protectedChain := alice.New(m.Auth.RequireAuth)
	HRChain := protectedChain.Append(middleware.RequireRole("hr", "admin"))
	AdminChain := protectedChain.Append(middleware.RequireRole("admin"))

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
