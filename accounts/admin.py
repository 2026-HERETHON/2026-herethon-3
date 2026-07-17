from django.contrib import admin

# Register your models here.
from django.contrib.auth.admin import UserAdmin
from .models import User, SavedGrid


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'nickname', 'email', 'is_staff', 'is_verified')
    fieldsets = UserAdmin.fieldsets + (
        ('추가 정보', {
            'fields': ('nickname', 'gender', 'profile_image', 'privacy_agreed_at')
        }),
        ('실거주지 인증', {
            'fields': ('verified_grid', 'is_verified', 'verified_at')
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('추가 정보', {'fields': ('nickname', 'gender')}),
    )


admin.site.register(User, CustomUserAdmin)
admin.site.register(SavedGrid)