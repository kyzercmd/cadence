package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/service"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(s service.AuthService) *AuthHandler {
	return &AuthHandler{authService: s}
}

// Login godoc
// @Summary      Log in to the system
// @Description  Authenticates a user using email and password, returning an auth session.
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        credentials body models.LoginPayload true "Login Credentials"
// @Success      200  {object}  models.AuthSession "Successfully authenticated"
// @Failure      400  {string}  string "Invalid request payload"
// @Failure      401  {string}  string "Invalid email or password"
// @Failure      401  {string}  string "User account is deactivated"
// @Failure      500  {string}  string "Internal server error"
// @Router       /auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginPayload

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	session, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if err == models.ErrInvalidCredentials {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}
		if err == models.ErrUserDeactivated {
			http.Error(w, err.Error(), http.StatusUnauthorized)
		}
		http.Error(w, "Failed to login", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(session)
}

// Refresh godoc
// @Summary      Refresh authentication session
// @Description  Obtains a new JWT token using a valid refresh token.
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        payload body models.RefreshPayload true "Refresh Token Payload"
// @Success      200  {object}  models.AuthSession "Successfully refreshed session"
// @Failure      400  {string}  string "Invalid request body"
// @Failure      401  {string}  string "Unauthorized: Invalid or expired refresh token"
// @Router       /auth/refresh [post]
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.RefreshPayload

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	session, err := h.authService.RefreshSession(r.Context(), req.RefreshToken)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid or expired refresh token", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(session)
}
