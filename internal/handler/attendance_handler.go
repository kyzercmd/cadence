package handler

import (
	"encoding/json"
	"errors"
	"net/http"

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
