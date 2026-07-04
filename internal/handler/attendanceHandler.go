package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/service"
)

type AttendanceHandler struct {
	AttendanceService service.AttendanceService
}

func NewAttendanceHandler(s service.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{AttendanceService: s}
}

// ClockIn godoc
// @Summary      Clock in for the day
// @Description  Creates a new attendance entry for the logged-in employee for today's date.
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Success      201  {object}  models.AttendanceEntry "Successfully clocked in"
// @Failure      400  {string}  string "You have already clocked in for today"
// @Failure      500  {string}  string "Failed to clock in"
// @Security     BearerAuth
// @Router       /attendance/clock-in [post]
func (h *AttendanceHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	entry, err := h.AttendanceService.ClockIn(r.Context(), userID)
	if err != nil {
		if errors.Is(err, models.ErrAlreadyClockedIn) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "Failed to clock in", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(entry)
}

// ClockOut godoc
// @Summary      Clock out for the day
// @Description  Updates today's attendance entry with a clock-out time and automatically calculates total minutes worked.
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Success      200  {object}  models.AttendanceEntry "Successfully clocked out"
// @Failure      400  {string}  string "You have not clocked in for today OR You have already clocked out for today"
// @Failure      500  {string}  string "Failed to clock out"
// @Security     BearerAuth
// @Router       /attendance/clock-out [post]
func (h *AttendanceHandler) ClockOut(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	entry, err := h.AttendanceService.ClockOut(r.Context(), userID)
	if err != nil {
		if errors.Is(err, models.ErrAlreadyClockedOut) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		} else if errors.Is(err, models.ErrHaveNotClockedIn) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "Failed to clock out", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(entry)
}

// GetTodayAttendance godoc
// @Summary      Get today's attendance status
// @Description  Fetches the attendance entry for the logged-in user for the current date. Will return null if the user hasn't clocked in yet.
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Success      200  {object}  models.AttendanceEntry "Today's attendance entry (or null)"
// @Failure      500  {string}  string "Failed to get Today's attendance"
// @Security     BearerAuth
// @Router       /attendance/me [get]
func (h *AttendanceHandler) GetTodayAttendance(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	entry, err := h.AttendanceService.GetTodayAttendance(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to get Today's attendance", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(entry)
}

// GetMyHistory godoc
// @Summary      Get personal attendance history
// @Description  Fetches the attendance history for the logged-in user, sorted by date descending.
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Param        limit query int false "Number of records to return (defaults to 30)"
// @Success      200  {array}   models.AttendanceEntry "List of attendance entries"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      500  {string}  string "Failed to fetch attendance history"
// @Security     BearerAuth
// @Router       /attendance/history [get]
func (h *AttendanceHandler) GetMyHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	limit := 30
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsed, err := strconv.Atoi(limitParam); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	history, err := h.AttendanceService.GetAttendanceHistory(r.Context(), userID, limit)
	if err != nil {
		http.Error(w, "Failed to fetch attendance history", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(history)
}

// GetAllEmployeesAttendance godoc
// @Summary      Get latest attendance for all employees
// @Description  Fetches a list of all active employees along with their most recent clock-in data. Requires HR or Admin privileges.
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Success      200  {array}   models.EmployeeLatestAttendance "List of employees with latest attendance"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      403  {string}  string "Forbidden"
// @Failure      500  {string}  string "Failed to fetch employees attendance"
// @Security     BearerAuth
// @Router       /attendance/employees [get]
func (h *AttendanceHandler) GetAllEmployeesAttendance(w http.ResponseWriter, r *http.Request) {

	employees, err := h.AttendanceService.GetAllEmployeesAttendance(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch employees attendance", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(employees)
}

// GetEmployeeHistory godoc
// @Summary      Get an employee's attendance history
// @Description  Fetches the attendance history for a specific employee by ID. Requires HR or Admin privileges.
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Param        targetid path  string true "Employee User ID"
// @Param        limit    query int    false "Number of records to return (defaults to 30)"
// @Success      200  {array}   models.AttendanceEntry "List of attendance entries"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      403  {string}  string "Forbidden"
// @Failure      500  {string}  string "Failed to get employee history"
// @Security     BearerAuth
// @Router       /attendance/{targetid}/history [get]
func (h *AttendanceHandler) GetEmployeeHistory(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("targetid")

	limit := 30
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsed, err := strconv.Atoi(limitParam); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	history, err := h.AttendanceService.GetAttendanceHistory(r.Context(), targetID, limit)
	if err != nil {
		http.Error(w, "Failed to get employee history", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(history)
}
