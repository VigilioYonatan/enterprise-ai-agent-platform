import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';

export function toOpenApiSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    unrepresentable: ({ message }: { message: string }) => {
      if (message.toLowerCase().includes('date')) {
        return { type: 'string', format: 'date-time' };
      }
      return { type: 'string' };
    },
  }) as Record<string, unknown>;
}

export function ApiZodBody(schema: z.ZodType, description?: string) {
  return ApiBody({
    description,
    required: true,
    schema: toOpenApiSchema(schema),
  });
}

export function ApiZodOkResponse(schema: z.ZodType, description?: string) {
  return ApiOkResponse({
    description: description ?? 'Operación exitosa',
    schema: toOpenApiSchema(schema),
  });
}

export function ApiZodCreatedResponse(schema: z.ZodType, description?: string) {
  return ApiCreatedResponse({
    description: description ?? 'Recurso creado exitosamente',
    schema: toOpenApiSchema(schema),
  });
}

export function ApiZodErrorResponse(
  status: number,
  description: string,
  schema?: z.ZodType,
) {
  return ApiResponse({
    status,
    description,
    schema: schema ? toOpenApiSchema(schema) : undefined,
  });
}

export function ApiStandardErrors() {
  return applyDecorators(
    ApiBadRequestResponse({ description: 'Parámetros o payload inválidos' }),
    ApiUnauthorizedResponse({
      description: 'Autenticación requerida o token inválido',
    }),
    ApiForbiddenResponse({
      description: 'Permisos insuficientes en el tenant',
    }),
    ApiInternalServerErrorResponse({
      description: 'Error interno del servidor',
    }),
  );
}

export function ApiItemNotFound() {
  return ApiNotFoundResponse({ description: 'Recurso no encontrado' });
}
