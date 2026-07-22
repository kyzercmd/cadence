//go:build !production

package router

import (
	"net/http"

	_ "github.com/kyzercmd/cadence/docs"
	httpSwagger "github.com/swaggo/http-swagger"
)

func registerSwagger(mux *http.ServeMux) {
	mux.Handle("/swagger/", httpSwagger.WrapHandler)
}
