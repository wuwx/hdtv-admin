// 请确保你的mysql数据库使用utf8编码
// 可以使用`SET NAMES 'utf8';`

const express = require("express")
const bodyParser = require("body-parser")
const Sequelize = require("sequelize")
const path = require("path")
const mysqlConfig = require("../config/admin")
const cors = require("cors")
const hostConfig = require("../config/config")

const OPERATE = Sequelize.Op

// 将正在播放的列表存储在内存中, 用于减少mysql的负载
const liveList = []

// 使用中间件
const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(bodyParser.text())
app.use(cors())

// 建立数据库
const sequelize = new Sequelize(mysqlConfig.database, mysqlConfig.user,
    mysqlConfig.password, {
        host: mysqlConfig.host,
        dialect: "mysql",
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        }
    })
const User = sequelize.import(path.resolve(__dirname, "./models/User.js"))

// 同步数据库
sequelize.sync({ force: true }).then((res) => {
    console.log("同步数据库完成!")

    User.create({
        id: "test",
        authority: 3,
        channelName: "测试频道"
    })
    app.listen(3000)
}, (err) => {
    console.log("同步数据库失败!")
    throw new Error(err)
})

// 推流认证路由
app.post("/authorize", (req, res) => {
    console.log(req.body)

})

// 节目推流完毕后从liveList中删除
app.post("/liveDone", (req, res) => {

})

// 添加用户
app.post(hostConfig.addUserRouter, (req, res) => {
    let info = JSON.parse(req.body)
    if (!info) {
        return
    }
    if (!info.userId || !info.userPassword || !info.userChannelName) {
        return
    }
    User.findOne({
        where: {
            id: info.id,
            password: info.password,
            authority: {
                [OPERATE.or]: [2, 3]
            }
        }
    }).then((user) => {
        if (!user) {
            res.status(200).json({
                isSuccess: false,
                err: "用户认证失败, 请确认你的权限足够"
            })
        } else {
            User.findOne({
                where: {
                    id: info.userId
                }
            }).then((newUser) => {
                if (newUser) {
                    res.status(200).json({
                        isSuccess: false,
                        err: "该用户ID已经存在"
                    })
                } else {
                    res.status(200).json({
                        isSuccess: true,
                        err: ""
                    })
                    User.create({
                        id: info.userId,
                        password: info.userPassword,
                        channelName: info.channelName,
                        authority: 1,
                        createdBy: user.get({ plain }).id
                    })
                }
            })
        }
    })
})

// 添加管理员
app.post(hostConfig.addAdminRouter, (req, res) => {
    let info = JSON.parse(req.body)
    if (!info) {
        return
    }
    if (!info.userId || !info.userPassword) {
        return
    }
    User.findOne({
        where: {
            id: info.id,
            password: info.password,
            authority: 3
        }
    }).then((user) => {
        if (!user) {
            res.status(200).json({
                isSuccess: false,
                err: "用户认证失败, 请确认你的权限足够"
            })
        } else {
            User.findOne({
                where: {
                    id: info.userId
                }
            }).then((newUser) => {
                if (newUser) {
                    res.status(200).json({
                        isSuccess: false,
                        err: "该用户ID已经存在"
                    })
                } else {
                    res.status(200).json({
                        isSuccess: true,
                        err: ""
                    })
                    User.create({
                        id: info.userId,
                        password: info.userPassword,
                        authority: 2,
                        createdBy: user.get({ plain }).id
                    })
                }
            })
        }
    })
})

// 删除用户
app.post(hostConfig.deleteUserRouter, (req, res) => {

})

// 删除管理员
app.post(hostConfig.deleteAdminRouter, (req, res) => {

})

// 修改密码
app.post(hostConfig.changePasswordRouter, (req, res) => {
    let info = JSON.parse(req.body)
    if (!info) {
        return
    }
    if (info.password.length <= 5) {
        res.status(200).json({
            isSuccess: false,
            err: "新密码密码长度未超过5位"
        })
        return
    }
    User.findOne({
        where: {
            id: info.id,
            password: info.password
        }
    }).then((user) => {
        let response
        if (user) {
            response = {
                isSuccess: true,
                err: ""
            }
            user.update({
                password: info.newPassword
            })
        } else {
            response = {
                isSuccess: false,
                err: "用户认证失败, 请确定你已登陆"
            }
        }
        res.status(200).json(response)
    })
})

// 登陆账号
app.post(hostConfig.loginRouter, (req, res) => {
    let info = JSON.parse(req.body)
    if (!info) {
        return
    }
    User.findOne({
        where: {
            id: info.id,
            password: info.password
        },
    }).then((user) => {
        let response
        if (user) {
            response = {
                isSuccess: true,
                err: "",
                authority: user.get({ plain: true }).authority
            }
        } else {
            response = {
                isSuccess: false,
                err: "账号ID或者密码错误"
            }
        }
        res.status(200).json(response)
        res.end()
    })
})