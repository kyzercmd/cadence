package models

import (
	"time"
)

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	AvatarURL string    `json:"avatarUrl"`
	Role      Role      `json:"role"`
	Position  string    `json:"position"`
	Level     Level     `json:"level"`
	Gender    Gender    `json:"gender"`
	Birthday  time.Time `json:"birthday"`
	Company   string    `json:"company"`
	Location  string    `json:"location"`
	Mobile    string    `json:"mobile"`
	Skype     string    `json:"skype"`
	Active    bool      `json:"active"`
}

type AuthSession struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
	User         User   `json:"user"`
}

type LoginPayload struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshPayload struct {
	RefreshToken string `json:"refreshtoken"`
}

type CreateUserPayload struct {
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	AvatarURL string    `json:"avatarUrl"`
	Role      string    `json:"role"`
	Position  string    `json:"position"`
	Level     string    `json:"level"`
	Gender    string    `json:"gender"`
	Birthday  time.Time `json:"birthday"`
	Company   string    `json:"company"`
	Location  string    `json:"location"`
	Mobile    string    `json:"mobile"`
	Skype     string    `json:"skype"`
}

type UpdateSelfPayload struct {
	AvatarURL *string `json:"avatarURL"`
	Location  *string `json:"location"`
	Mobile    *string `json:"mobile"`
	Skype     *string `json:"skype"`
}

type HRUpdateEmployeePayload struct {
	Name      *string    `json:"name"`
	AvatarURL *string    `json:"avatarUrl"`
	Level     *Level     `json:"level"`
	Gender    *Gender    `json:"gender"`
	Birthday  *time.Time `json:"birthday"`
	Company   *string    `json:"company"`
	Location  *string    `json:"location"`
	Mobile    *string    `json:"mobile"`
	Skype     *string    `json:"skype"`
	Active    *bool      `json:"active"`
}

type UserUpdatePayload struct {
	Name      *string    `json:"name"`
	Email     *string    `json:"email"`
	Password  *string    `json:"password"`
	AvatarURL *string    `json:"avatarUrl"`
	Role      *Role      `json:"role"`
	Position  *string    `json:"position"`
	Level     *Level     `json:"level"`
	Gender    *Gender    `json:"gender"`
	Birthday  *time.Time `json:"birthday"`
	Company   *string    `json:"company"`
	Location  *string    `json:"location"`
	Mobile    *string    `json:"mobile"`
	Skype     *string    `json:"skype"`
	Active    *bool      `json:"active"`
}

type UserListResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatarUrl"`
	Role      Role   `json:"role"`
	Position  string `json:"position"`
	Level     Level  `json:"level"`
	Active    bool   `json:"active"`
}
