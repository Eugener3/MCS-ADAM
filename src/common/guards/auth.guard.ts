import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request: Request = context.switchToHttp().getRequest();
        if(!request.query.key)
            throw new UnauthorizedException('Password not provided in the request');
        if(request.query.key != this.configService.getOrThrow('ADMIN_KEY'))
            throw new ForbiddenException('Wrong Password');
        return true;
    }
}