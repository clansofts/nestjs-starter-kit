import { Inject, ForbiddenException, Injectable } from "@nestjs/common";

import * as _ from "lodash";
import * as jwt from "jsonwebtoken";

import { AuthDiToken } from "../auth.di";
import { PasswordService } from "./password.service";
import { ConfigDiToken, Config } from "../../config";
import { UserLoginDto, JwtUserData } from "../auth.interfaces";
import { UserDiToken, UserService, UserDto } from "../../user";
import { LoggerDiToken, LoggerService } from "../../logger";


@Injectable()
export class AuthService {
    public static SECRET: string;

    public constructor(
        @Inject(ConfigDiToken.CONFIG) private readonly config: Config,
        @Inject(UserDiToken.USER_SERVICE) private readonly userService: UserService,
        @Inject(AuthDiToken.PASSWORD_SERVICE) private readonly passwordService: PasswordService,
        @Inject(LoggerDiToken.LOGGER) private readonly logger: LoggerService,
    ) {
        AuthService.SECRET = this.config.auth.tokenSecret;
    }

    public async login(userInfo: UserLoginDto): Promise<{ token: string }> {
        let user: UserDto;
        try {
            // TODO: apply filter. any error -> forbidden
            user = await this.userService.getByEmail(userInfo.email);
        } catch (err) {
            this.logger.error(err);

            throw new ForbiddenException();
        }

        await this.passwordService.verify(userInfo.password, user.passwordHash);

        const token: string = await this.createToken(user);

        return { token };
    }

    private createToken(user: UserDto): string {
        // TODO: move to TokenService
        const { tokenSecret, tokenExpiration } = this.config.auth;
        const userFullName: string = _.trim(`${user.contact.firstName || ""} ${user.contact.lastName || ""}`);
        const payload: JwtUserData = {
            id: user.id,
            name: userFullName,
            email: user.contact.email,
            roles: [user.role],
        };
        const token = jwt.sign(payload, tokenSecret, { expiresIn: tokenExpiration });

        return token;
    }

    public verifyToken(token: string): void {
        try {
            jwt.verify(token, this.config.auth.tokenSecret);
        } catch (err) {
            throw new Error("Token verify failed"); // TODO: replace with roken verify failed exception
        }
    }
}
