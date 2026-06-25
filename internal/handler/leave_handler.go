package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/service"
)

type LeaveHandler struct {
	leaveService service.LeaveService
}

func NewLeaveHandler(s service.LeaveService) *LeaveHandler {
	return &LeaveHandler{leaveService: s}
}

// SubmitLeave godoc
// @Summary      Submit a leave request
// @Description  Allows an employee to submit a time-off request (Sick, Vacation, Remote) with dates and reasons.
// @Tags         Leave
// @Accept       json
// @Produce      json
// @Param        payload body models.CreateLeavePayload true "Leave Request Details"
// @Success      201  {object}  map[string]interface{} "Leave request submitted successfully"
// @Failure      400  {string}  string "Invalid payload or dates"
// @Failure      500  {string}  string "Internal server error"
// @Security     BearerAuth
// @Router       /leave [post]
func (h *LeaveHandler) SubmitLeave(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	var payload models.CreateLeavePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	leaveID, err := h.leaveService.CreateLeaveRequest(r.Context(), userID, &payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Leave request submitted successfully",
		"leaveId": leaveID,
	})
}

// GetMyLeaves godoc
// @Summary      Get personal leave requests
// @Description  Fetches all past and pending leave requests for the logged-in employee.
// @Tags         Leave
// @Accept       json
// @Produce      json
// @Success      200  {array}   models.LeaveRequest "List of leave requests"
// @Failure      500  {string}  string "Internal server error"
// @Security     BearerAuth
// @Router       /leave/me [get]
func (h *LeaveHandler) GetMyLeaves(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	leaves, err := h.leaveService.GetMyLeaveRequests(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to fetch leave requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leaves)
}

// GetPendingLeaves godoc
// @Summary      Get pending leave requests (HR)
// @Description  Fetches a queue of all pending leave requests across the company. Requires HR or Admin privileges.
// @Tags         Leave
// @Accept       json
// @Produce      json
// @Success      200  {array}   models.LeaveRequestWithUser "List of pending requests with user details"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      403  {string}  string "Forbidden"
// @Failure      500  {string}  string "Internal server error"
// @Security     BearerAuth
// @Router       /leave/pending [get]
func (h *LeaveHandler) GetPendingLeaves(w http.ResponseWriter, r *http.Request) {
	leaves, err := h.leaveService.GetPendingLeaveRequests(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch pending requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leaves)
}

// GetAllLeaves godoc
// @Summary      Get all leave requests (HR History)
// @Description  Fetches a complete history of all leave requests (pending, approved, rejected) across the company. Requires HR or Admin privileges.
// @Tags         Leave
// @Accept       json
// @Produce      json
// @Success      200  {array}   models.LeaveRequestWithUser "List of all requests with user details"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      403  {string}  string "Forbidden"
// @Failure      500  {string}  string "Internal server error"
// @Security     BearerAuth
// @Router       /leave/all [get]
func (h *LeaveHandler) GetAllLeaves(w http.ResponseWriter, r *http.Request) {
	leaves, err := h.leaveService.GetAllLeaveRequests(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch all leave requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leaves)
}

// ReviewLeave godoc
// @Summary      Approve or Reject a leave request
// @Description  Allows HR or Admins to action a pending leave request and optionally provide a comment.
// @Tags         Leave
// @Accept       json
// @Produce      json
// @Param        leaveid      path string true "Leave Request ID"
// @Param        payload body models.ReviewLeavePayload true "Approval or Rejection details"
// @Success      200  {object}  map[string]interface{} "Leave request updated"
// @Failure      400  {string}  string "Invalid payload"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      403  {string}  string "Forbidden"
// @Failure      500  {string}  string "Internal server error"
// @Security     BearerAuth
// @Router       /leave/{leaveid}/review [patch]
func (h *LeaveHandler) ReviewLeave(w http.ResponseWriter, r *http.Request) {
	leaveID := r.PathValue("leaveid")
	reviewerID := r.Context().Value(middleware.UserIDkey).(string)

	var payload models.ReviewLeavePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := h.leaveService.ReviewLeaveRequest(r.Context(), leaveID, reviewerID, &payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Leave request successfully updated",
		"leaveId": leaveID,
	})
}
