package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/service"
)

type NotificationHandler struct {
	notifService service.NotificationService
}

func NewNotificationHandler(svc service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifService: svc}
}

// GetMyNotifications godoc
// @Summary      Get personal notifications
// @Description  Fetches the logged-in user's recent notifications.
// @Tags         Notifications
// @Accept       json
// @Produce      json
// @Param        limit query int false "Number of records to return (defaults to 20)"
// @Success      200  {array}   models.Notification "List of notifications"
// @Failure      500  {string}  string "Failed to fetch notifications"
// @Security     BearerAuth
// @Router       /notifications [get]
func (h *NotificationHandler) GetMyNotifications(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	limit := 20
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsed, err := strconv.Atoi(limitParam); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	notifs, err := h.notifService.GetMyNotifications(r.Context(), userID, limit)
	if err != nil {
		http.Error(w, "Failed to fetch notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}

// MarkAsRead godoc
// @Summary      Mark notification as read
// @Description  Marks a specific notification as read when the user clicks on it.
// @Tags         Notifications
// @Accept       json
// @Produce      json
// @Param        id   path      string true "Notification ID"
// @Success      200  {object}  map[string]interface{} "Successfully marked as read"
// @Failure      500  {string}  string "Internal server error"
// @Security     BearerAuth
// @Router       /notifications/{notifid}/read [patch]
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	notifID := r.PathValue("notifid")
	userID := r.Context().Value(middleware.UserIDkey).(string)

	err := h.notifService.MarkAsRead(r.Context(), notifID, userID)
	if err != nil {
		http.Error(w, "Failed to update notification", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Marked as read"})
}

// MarkAllAsRead godoc
// @Summary      Mark all notifications as read
// @Description  Marks all unread notifications as read for the logged-in user.
// @Tags         Notifications
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{} "Successfully marked all as read"
// @Failure      500  {string}  string "Internal server error"
// @Security     BearerAuth
// @Router       /notifications/read-all [patch]
func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	err := h.notifService.MarkAllAsRead(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to update notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "All marked as read"})
}
