"use client";

import { fetchApi, fetchFile } from "@/app/_modules/func";
import {
  CaretDownOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  FileAddOutlined,
  KeyOutlined,
  LoadingOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type {
  ActionType,
  ProColumns,
  ProFormInstance,
} from "@ant-design/pro-components";
import {
  ModalForm,
  PageContainer,
  ProCard,
  ProForm,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormTreeSelect,
  ProTable,
} from "@ant-design/pro-components";
import type { GetProp, TreeDataNode, UploadProps } from "antd";
import {
  Button,
  Checkbox,
  Col,
  Dropdown,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Switch,
  Tree,
  Typography,
  Upload,
} from "antd";
import { useRouter } from "next/navigation";

import {
  faDownload,
  faPenToSquare,
  faToggleOff,
  faToggleOn,
  faUpload,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useEffect, useMemo, useRef, useState } from "react";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

const { Dragger } = Upload;

export type OptionType = {
  label: string;
  value: string | number;
};

export default function User() {
  const { push } = useRouter();

  //新建用户预置密码值
  const [defaultPassword, setDefaultPassword] = useState("");

  useEffect(() => {
    queryOrgTree();
    queryRole();
  }, []);

  //控制行的状态值的恢复
  const [rowStatusMap, setRowStatusMap] = useState<{ [key: number]: boolean }>(
    {}
  );

  //表格列定义
  const columns: ProColumns[] = [
    {
      title: "编号",
      dataIndex: "id",
      width: 48,
      search: false,
    },
    {
      title: "用户名称",
      fieldProps: {
        placeholder: "请输入用户名称",
      },
      dataIndex: "user_name",
      ellipsis: true,
      sorter: true,
      order: 5,
    },
    {
      title: "用户昵称",
      fieldProps: {
        placeholder: "请输入用户昵称",
      },
      dataIndex: "nick_name",
      ellipsis: true,
      sorter: true,
      order: 4,
    },
    {
      title: "部门名称",
      key: "project_name",
      ellipsis: true,
      search: false,
      render: (text, record) => {
        if (record.project_roles.length > 0) {
          return record.project_roles[0].project_name ?? "-";
        }
        return "-";
      },
    },
    {
      title: "手机号",
      fieldProps: {
        placeholder: "请输入手机号",
      },
      dataIndex: "phone",
      order: 3,
    },
    {
      title: "状态",
      fieldProps: {
        placeholder: "请选择用户状态",
      },
      dataIndex: "status",
      valueType: "select",
      order: 2,
      valueEnum: {
        true: {
          text: "正常",
          status: true,
        },
        false: {
          text: "停用",
          status: false,
        },
      },
      render: (text, record) => {
        return (
          <Space>
            <Switch
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              defaultChecked={record.status}
              checked={rowStatusMap[record.id]}
              disabled={record.id == 1}
              onChange={(checked, event) => {
                showSwitchUserStatusModal(checked, record);
              }}
            />
          </Space>
        );
      },
    },
    {
      title: "创建时间",
      dataIndex: "gmt_create",
      valueType: "dateTime",
      ellipsis: true,
      search: false,
      sorter: true,
    },
    {
      title: "操作",
      key: "option",
      search: false,
      render: (_, record) => {
        if (record.id != 1)
          return [
            <Button
              key="modifyBtn"
              type="link"
              icon={<FontAwesomeIcon icon={faPenToSquare} />}
              onClick={() => showRowModifyModal(record)}
            >
              修改
            </Button>,
            <Button
              key="deleteBtn"
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onClickDeleteRow(record)}
            >
              删除
            </Button>,
            <Dropdown
              key="moreDrop"
              menu={{
                items: [
                  {
                    key: "1",
                    label: (
                      <a
                        onClick={() => {
                          modifyUserPwd(record);
                        }}
                      >
                        重置密码
                      </a>
                    ),
                    icon: <KeyOutlined />,
                  },
                  {
                    key: "2",
                    label: (
                      <a
                        onClick={() =>
                          push(`/system/user/auth/${record.userId}`)
                        }
                      >
                        分配角色
                      </a>
                    ),
                    icon: <FontAwesomeIcon icon={faUsers} />,
                  },
                ],
              }}
            >
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  更多
                  <CaretDownOutlined />
                </Space>
              </a>
            </Dropdown>,
          ];
      },
    },
  ];

  //是否展示修改用户对话框
  const [showModifyUserModal, setShowModifyUserModal] = useState(false);

  //展示修改用户对话框
  const showRowModifyModal = (record?: any) => {
    queryUserInfo(record);
    setShowModifyUserModal(true);
  };

  //是否展示修改密码
  const [showModifyUserPwdModal, setShowModifyUserPwdModal] = useState(false);

  //重置密码表单引用
  const [pwdFormRef] = Form.useForm();

  const modifyUserPwd = (record: any) => {
    attachUserdata["userId"] = record.userId;
    attachUserdata["userName"] = record.userName;
    setAttachUserdata(attachUserdata);

    setShowModifyUserPwdModal(true);
  };

  //确认重置密码
  const confirmModifyUserPwd = () => {
    pwdFormRef.submit();
  };

  //取消重置密码
  const cancelModifyUserPwd = () => {
    setShowModifyUserPwdModal(false);
  };

  //执行重置密码
  const executeModifyUserPwd = async (values: any) => {
    setShowModifyUserPwdModal(false);
    values["userId"] = attachUserdata["userId"];
    const body = await fetchApi("/api/system/user/resetPwd", push, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
    if (body != undefined) {
      if (body.code == 200) {
        message.success(`修改${attachUserdata["userName"]}密码成功`);
      } else {
        message.error(body.msg);
      }
    }
    pwdFormRef.resetFields();
  };

  //查询用户数据
  const getUser = async (params: any, sorter: any, filter: any) => {
    const searchParams = {
      page: params.current - 1,
      size: params.pageSize,
      ...params,
    };

    delete searchParams.current;
    delete searchParams.pageSize;

    const queryParams = new URLSearchParams(searchParams);

    Object.keys(sorter).forEach((key) => {
      queryParams.append("property", key);
      if (sorter[key] === "ascend") {
        queryParams.append("order", "asc");
      } else {
        queryParams.append("order", "desc");
      }
    });

    //如果有组织id，添加相应查询参数
    if (searchProjectId != 0) {
      queryParams.append("project_id", searchProjectId.toString());
    }

    const body = await fetchApi(`/api/users?${queryParams}`, push);

    if (body !== undefined) {
      body.data.content.forEach((row: any) => {
        setRowStatusMap({ ...rowStatusMap, [row.id]: row.status });
      });
    }

    return body;
  };

  //展示切换用户状态对话框
  const showSwitchUserStatusModal = (checked: boolean, record: any) => {
    setRowStatusMap({ ...rowStatusMap, [record.id]: checked });

    Modal.confirm({
      title: "系统提示",
      icon: <ExclamationCircleFilled />,
      content: `确认要${checked ? "启用" : "停用"}"${
        record.user_name
      }"用户吗？`,
      onOk() {
        executeSwitchStatus(checked, record.userId, () => {
          setRowStatusMap({ ...rowStatusMap, [record.id]: !checked });
        });
      },
      onCancel() {
        setRowStatusMap({ ...rowStatusMap, [record.id]: !checked });
      },
    });
  };

  //确认变更用户状态
  const executeSwitchStatus = async (
    checked: boolean,
    userId: string,
    erroCallback: () => void
  ) => {
    const modifyData = {
      userId: userId,
      status: checked ? "0" : "1",
    };
    const body = await fetchApi(`/api/system/user/changeStatus`, push, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(modifyData),
    });

    if (body !== undefined) {
      if (body.code == 200) {
        message.success(body.msg);
      } else {
        message.error(body.msg);
        erroCallback();
      }
    }
  };

  //删除按钮是否可用，选中行时才可用
  const [rowCanDelete, setRowCanDelete] = useState(false);

  //选中行操作
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRow, setSelectedRow] = useState(undefined as any);

  //修改按钮是否可用
  const [rowCanModify, setRowCanModify] = useState(false);

  const rowSelection = {
    onChange: (newSelectedRowKeys: React.Key[], selectedRows: any[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
      setRowCanDelete(newSelectedRowKeys && newSelectedRowKeys.length > 0);

      if (newSelectedRowKeys && newSelectedRowKeys.length == 1) {
        setSelectedRow(selectedRows[0]);
        setRowCanModify(true);
      } else {
        setRowCanModify(false);
        setSelectedRow(undefined);
      }
    },

    getCheckboxProps: (record: any) => ({
      disabled: record.id == 1,
    }),
  };

  //查询用的组织id
  const [searchProjectId, setSearchProjectId] = useState(0);

  //选择组织树执行过滤
  const selectOrgData = (selectedProjectKey: React.Key[]) => {
    if (selectedProjectKey && selectedProjectKey.length > 0) {
      setSearchProjectId(selectedProjectKey[0] as number);
    } else {
      setSearchProjectId(0);
    }

    if (formRef.current) {
      formRef.current.submit();
    }
  };

  //用于搜索的组织选择数据
  const [orgTreeData, setOrgTreeData] = useState([] as Array<TreeDataNode>);

  //用于对话框的组织选择数据
  const [orgSelectData, setOrgSelectData] = useState([] as Array<TreeDataNode>);

  //查询组织树
  const queryOrgTree = async () => {
    const body = await fetchApi("/api/projects/tree", push);
    if (body !== undefined) {
      const tree = generateOrgTree(body.data);
      setOrgTreeData(tree);
      setSearchValue("");
      setOrgSelectData(tree);
    }
  };

  //查询角色信息
  const queryRole = async () => {
    const body = await fetchApi("/api/roles", push);
    if (body !== undefined) {
      const roleArray: Array<OptionType> = new Array<OptionType>();
      body.data.content.forEach((role: any) => {
        const option: OptionType = {
          label: role.name,
          value: role.id,
        };
        roleArray.push(option);
      });

      setRoleValue(roleArray);
    }
  };

  //搜索部门的值
  const [searchValue, setSearchValue] = useState("");

  //搜索组织树数据
  const onSearchDept = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  //搜索过滤后的组织树展示数据
  const filterOrgTree = useMemo(() => {
    const loop = (data: TreeDataNode[]): TreeDataNode[] =>
      data.map((item) => {
        const strTitle = item.title as string;
        const index = strTitle.indexOf(searchValue);
        const beforeStr = strTitle.substring(0, index);
        const afterStr = strTitle.slice(index + searchValue.length);
        const title =
          index > -1 ? (
            <span>
              {beforeStr}
              <span style={{ color: "#f50" }}>{searchValue}</span>
              {afterStr}
            </span>
          ) : (
            <span>{strTitle}</span>
          );
        if (item.children) {
          return { title, key: item.key, children: loop(item.children) };
        }

        return {
          title,
          key: item.key,
        };
      });

    const data = loop(orgTreeData);
    return data;
  }, [orgTreeData, searchValue]);

  const generateOrgTree = (orgData: []) => {
    const children: Array<TreeDataNode> = new Array<TreeDataNode>();

    orgData.forEach((item: any) => {
      const node: TreeDataNode = {
        title: item.name,
        key: item.id,
      };
      children.push(node);
      parseChild(item, node);
    });
    return children;
  };

  const parseChild = (parentItem: any, parentNode: TreeDataNode) => {
    if (parentItem.children.length == 0) {
      return;
    }

    parentItem.children.sort((a: any, b: any) => a.order - b.order);

    parentNode.children = new Array<TreeDataNode>();

    parentItem.children.forEach((child: any) => {
      const node: TreeDataNode = {
        title: child.name,
        key: child.id,
      };

      parentNode.children.push(node);
      parseChild(child, node);
    });
  };

  //角色数据
  const [roleValue, setRoleValue] = useState([] as Array<OptionType>);

  //确定新建用户
  const executeAddUser = async (values: any) => {
    values = {
      ...values,
      project_roles: [
        {
          project_id: values.project_id,
          role_id: values.role_id,
        },
      ],
    };

    delete values.project_id;
    delete values.role_id;

    const body = await fetchApi("/api/users", push, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (body != undefined) {
      if (body.success) {
        message.success("添加用户成功");
        if (actionRef.current) {
          actionRef.current.reload();
        }
        return true;
      }

      message.error(body.message);
      return false;
    }
    return false;
  };

  //修改用户表单引用
  const modifyFormRef = useRef<ProFormInstance>();

  //操作用户的附加数据
  const [attachUserdata, setAttachUserdata] = useState<{ [key: string]: any }>(
    {}
  );

  //查询用户信息
  const queryUserInfo = async (record?: any) => {
    const userId = record !== undefined ? record.id : selectedRow.id;

    attachUserdata["id"] = userId;

    setAttachUserdata(attachUserdata);

    if (userId !== undefined) {
      const body = await fetchApi(`/api/users/${userId}`, push);

      if (body !== undefined) {
        if (body.success) {
          modifyFormRef?.current?.setFieldsValue({
            nick_name: body.data.nick_name,
            user_name: body.data.user_name,
            phone: body.data.phone,
            email: body.data.email,
            sex: body.data.sex,
            status: body.data.status,
          });
        }
      }
    }
  };

  //确认修改用户
  const executeModifyUser = async (values: any) => {
    values["id"] = attachUserdata["id"];

    const body = await fetchApi("/api/users", push, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (body !== undefined) {
      if (body.success) {
        message.success("修改用户成功");
        setShowModifyUserModal(false);
        //刷新列表
        if (actionRef.current) {
          actionRef.current.reload();
        }
        return true;
      }
      message.error(body.message);
      return false;
    }
  };

  //点击删除按钮
  const onClickDeleteRow = (record?: any) => {
    const userId = record != undefined ? record.id : selectedRowKeys.join(",");
    Modal.confirm({
      title: "系统提示",
      icon: <ExclamationCircleFilled />,
      content: `确定删除用户编号为“${userId}”的数据项？`,
      onOk() {
        executeDeleteRow(userId);
      },
      onCancel() {},
    });
  };

  //选中上传文件列表
  const [fileList, setFileList] = useState<FileType[]>([]);

  //上传前检查
  const beforeUpload = (file: FileType) => {
    setFileList([file]);
    const isExcel =
      file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (!isExcel) {
      message.error("请上传 xls、xlsx 格式文件！");
      setFileList([]);
    }
    return false;
  };

  //移除待上传文件
  const removeFile = () => {
    setFileList([]);
  };

  //上传文件是否刷新已有用户数据
  const [uploadSupport, setUploadSupport] = useState(false);

  //文件上传状态
  const [uploading, setUploading] = useState(false);

  //上传处理，手动上传下不会执行
  const handleChange: UploadProps["onChange"] = (info: any) => {
    if (info.file.status === "uploading") {
      setUploading(true);
      return;
    }
    if (info.file.status === "done") {
      setUploading(false);
      console.log(info.file.response);
      if (info.file.response.code == 200) {
        message.success(info.file.response.msg);
      } else {
        message.error(info.file.response.msg);
      }
    }
  };

  //导入对话框是否展示
  const [showImportModal, setShowImportModal] = useState(false);

  //点击导入按钮
  const onClickImport = () => {
    setShowImportModal(true);
  };

  //确定删除选中的用户
  const executeDeleteRow = async (userId: any) => {
    const body = await fetchApi(
      `/api/users/${userId.includes(",") ? "batch/" : ""}${userId}`,
      push,
      {
        method: "DELETE",
      }
    );
    if (body !== undefined) {
      if (body.success) {
        message.success("删除成功");

        //修改按钮变回不可点击
        setRowCanModify(false);
        //删除按钮变回不可点击
        setRowCanDelete(false);
        //选中行数据重置为空
        setSelectedRowKeys([]);
        //刷新列表
        if (actionRef.current) {
          actionRef.current.reload();
        }
      } else {
        message.error(body.message);
      }
    }
  };

  //确定导入
  const executeImport = async () => {
    if (fileList.length == 0) {
      message.error("请选择上传的文件");
      return;
    }

    setUploading(true);

    const file = fileList[0];
    const formData = new FormData();
    formData.append("file", file);
    const body = await fetchApi(
      `/api/users/import?updateSupport=${uploadSupport}`,
      push,
      {
        method: "POST",
        body: formData,
      }
    );

    setUploading(false);
    setUploadSupport(false);

    if (body !== undefined) {
      setFileList([]);
      if (body.success) {
        message.success("用户导入成功");
        //刷新列表
        if (actionRef.current) {
          actionRef.current.reload();
        }
      } else {
        message.error(body.message);
      }
    }
  };

  //取消导入对话框
  const cancelImportModal = () => {
    setShowImportModal(false);
    setUploadSupport(false);
    setFileList([]);
  };

  //搜索栏显示状态
  const [showSearch, setShowSearch] = useState(true);
  //action对象引用
  const actionRef = useRef<ActionType>();
  //表单对象引用
  const formRef = useRef<ProFormInstance>();

  //当前页数和每页条数
  const [page, setPage] = useState(1);
  const defaultPageSize = 10;
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const pageChange = (page: number, pageSize: number) => {
    setPage(page);
    setPageSize(pageSize);
  };

  return (
    <PageContainer title={false}>
      <Row gutter={{ xs: 8, sm: 8, md: 8 }}>
        <Col xs={24} sm={8} md={6}>
          <ProCard>
            <Input
              style={{ marginBottom: 16 }}
              placeholder="输入部门名称搜索"
              prefix={<SearchOutlined />}
              onChange={onSearchDept}
            />
            {filterOrgTree.length > 0 ? (
              <Flex>
                <Tree
                  switcherIcon={<CaretDownOutlined />}
                  defaultExpandAll
                  onSelect={selectOrgData}
                  treeData={filterOrgTree}
                />
              </Flex>
            ) : (
              <Flex justify="center" style={{ marginTop: "16px" }}>
                <Spin />
              </Flex>
            )}
          </ProCard>
        </Col>
        <Col xs={24} sm={16} md={18}>
          <ProTable
            formRef={formRef}
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              ...rowSelection,
            }}
            columns={columns}
            request={async (params: any, sorter: any, filter: any) => {
              // 表单搜索项会从 params 传入，传递给后端接口。
              const body = await getUser(params, sorter, filter);
              if (body !== undefined) {
                return Promise.resolve({
                  data: body.data.content,
                  success: true,
                  total: body.data.total_size,
                });
              }
              return Promise.resolve({
                data: [],
                success: true,
              });
            }}
            pagination={{
              defaultPageSize: defaultPageSize,
              showQuickJumper: true,
              showSizeChanger: true,
              onChange: pageChange,
            }}
            search={
              showSearch
                ? {
                    defaultCollapsed: false,
                    searchText: "搜索",
                  }
                : false
            }
            dateFormatter="string"
            actionRef={actionRef}
            toolbar={{
              actions: [
                <ModalForm
                  key="addmodal"
                  title="添加用户"
                  trigger={
                    <Button icon={<PlusOutlined />} type="primary">
                      新建
                    </Button>
                  }
                  autoFocusFirstInput
                  modalProps={{
                    destroyOnClose: true,
                  }}
                  submitTimeout={2000}
                  onFinish={executeAddUser}
                >
                  <ProForm.Group>
                    <ProFormText
                      width="md"
                      name="nick_name"
                      label="姓名"
                      placeholder="请输入姓名"
                      rules={[{ required: true, message: "请输入姓名" }]}
                    />
                    <ProFormSelect
                      width="md"
                      name="sex"
                      label="用户性别"
                      rules={[{ required: true, message: "请选择性别" }]}
                      options={[
                        {
                          value: 1,
                          label: "男",
                        },
                        {
                          value: 0,
                          label: "女",
                        },
                      ]}
                    />
                  </ProForm.Group>
                  <ProForm.Group>
                    <ProFormTreeSelect
                      width="md"
                      name="project_id"
                      label="所属部门"
                      placeholder="请选择所属部门"
                      rules={[{ required: true, message: "请选择所属部门" }]}
                      request={async () => {
                        return orgSelectData;
                      }}
                      fieldProps={{
                        filterTreeNode: true,
                        treeNodeFilterProp: "title",
                        fieldNames: {
                          label: "title",
                          value: "key",
                        },
                      }}
                    />
                    <ProFormSelect
                      width="md"
                      name="role_id"
                      label="角色"
                      placeholder="请选择角色"
                      rules={[{ required: true, message: "请选择角色" }]}
                      options={roleValue}
                    />
                  </ProForm.Group>
                  <ProForm.Group>
                    <ProFormText
                      width="md"
                      name="user_name"
                      label="用户名"
                      placeholder="请输入用户名"
                      rules={[{ required: true, message: "请输入用户名" }]}
                    />
                    <ProFormRadio.Group
                      name="status"
                      width="sm"
                      label="状态"
                      initialValue={true}
                      options={[
                        {
                          label: "正常",
                          value: true,
                        },
                        {
                          label: "停用",
                          value: false,
                        },
                      ]}
                    />
                  </ProForm.Group>
                  <ProForm.Group>
                    <ProFormText.Password
                      width="md"
                      name="password"
                      label="密码"
                      initialValue={defaultPassword}
                      placeholder="请输入密码"
                      rules={[{ required: true, message: "请输入密码" }]}
                    />
                    <ProFormText.Password
                      width="md"
                      name="repeat_password"
                      label="确认密码"
                      initialValue={defaultPassword}
                      placeholder="请再次输入密码"
                      rules={[
                        { required: true, message: "请再次输入密码" },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue("password") === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error("两次密码输入不一致")
                            );
                          },
                        }),
                      ]}
                    />
                  </ProForm.Group>
                  <ProForm.Group>
                    <ProFormText
                      width="md"
                      name="phone"
                      label="手机号码"
                      placeholder="请输入手机号码"
                      rules={[
                        {
                          pattern: /^1\d{10}$/,
                          message: "请输入正确的手机号码",
                        },
                      ]}
                    />
                    <ProFormText
                      width="md"
                      name="email"
                      label="邮箱"
                      placeholder="请输入邮箱"
                      rules={[
                        { type: "email", message: "请输入正确的邮箱地址" },
                      ]}
                    />
                  </ProForm.Group>
                </ModalForm>,
                <ModalForm
                  key="modifymodal"
                  title="修改用户"
                  formRef={modifyFormRef}
                  trigger={
                    <Button
                      icon={<FontAwesomeIcon icon={faPenToSquare} />}
                      disabled={!rowCanModify}
                      onClick={() => showRowModifyModal()}
                    >
                      修改
                    </Button>
                  }
                  open={showModifyUserModal}
                  autoFocusFirstInput
                  modalProps={{
                    destroyOnClose: true,
                    onCancel: () => {
                      setShowModifyUserModal(false);
                    },
                  }}
                  submitTimeout={2000}
                  onFinish={executeModifyUser}
                >
                  <ProForm.Group>
                    <ProFormText
                      width="md"
                      name="user_name"
                      disabled
                      label="用户名"
                      placeholder=""
                    />
                  </ProForm.Group>
                  <ProForm.Group>
                    <ProFormText
                      width="md"
                      name="nick_name"
                      label="姓名"
                      placeholder="请输入姓名"
                      rules={[{ required: true, message: "请输入姓名" }]}
                    />
                    <ProFormSelect
                      width="md"
                      name="sex"
                      label="用户性别"
                      rules={[{ required: true, message: "请选择性别" }]}
                      options={[
                        {
                          value: 1,
                          label: "男",
                        },
                        {
                          value: 0,
                          label: "女",
                        },
                      ]}
                    />
                  </ProForm.Group>
                  <ProForm.Group>
                    <ProFormText
                      width="md"
                      name="phone"
                      label="手机号码"
                      placeholder="请输入手机号码"
                      rules={[
                        {
                          pattern: /^1\d{10}$/,
                          message: "请输入正确的手机号码",
                        },
                      ]}
                    />
                    <ProFormText
                      width="md"
                      name="email"
                      label="邮箱"
                      placeholder="请输入邮箱"
                      rules={[
                        { type: "email", message: "请输入正确的邮箱地址" },
                      ]}
                    />
                  </ProForm.Group>
                </ModalForm>,

                <Button
                  key="danger"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!rowCanDelete}
                  onClick={() => onClickDeleteRow()}
                >
                  删除
                </Button>,
                <Button
                  key="import"
                  type="primary"
                  icon={<FontAwesomeIcon icon={faUpload} />}
                  onClick={onClickImport}
                >
                  导入
                </Button>,
              ],
              settings: [
                {
                  key: "switch",
                  icon: showSearch ? (
                    <FontAwesomeIcon icon={faToggleOn} />
                  ) : (
                    <FontAwesomeIcon icon={faToggleOff} />
                  ),
                  tooltip: showSearch ? "隐藏搜索栏" : "显示搜索栏",
                  onClick: (key: string | undefined) => {
                    setShowSearch(!showSearch);
                  },
                },
                {
                  key: "refresh",
                  tooltip: "刷新",
                  icon: <ReloadOutlined />,
                  onClick: (key: string | undefined) => {
                    if (actionRef.current) {
                      actionRef.current.reload();
                    }
                  },
                },
              ],
            }}
          />
        </Col>
      </Row>

      <Modal
        title={`修改${attachUserdata["userName"]}密码`}
        open={showModifyUserPwdModal}
        onOk={confirmModifyUserPwd}
        onCancel={cancelModifyUserPwd}
      >
        <Form form={pwdFormRef} onFinish={executeModifyUserPwd}>
          <Form.Item
            label="新密码"
            name="password"
            rules={[{ required: true, message: "请输入新密码" }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="用户导入"
        open={showImportModal}
        onOk={executeImport}
        onCancel={cancelImportModal}
      >
        <Flex justify="center">
          <div>
            <Dragger
              name="file"
              accept=".xls,.xlsx"
              listType="text"
              multiple={false}
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              onRemove={removeFile}
              showUploadList={{
                showDownloadIcon: false,
                showRemoveIcon: true,
                removeIcon: <CloseOutlined />,
              }}
            >
              <p className="ant-upload-drag-icon">
                {uploading ? <LoadingOutlined /> : <FileAddOutlined />}
              </p>
              <p className="ant-upload-text">点击此处或拖曳文件到此处上传</p>
              <p className="ant-upload-hint">仅支持 xls、xlsx 格式文件</p>
            </Dragger>
          </div>
        </Flex>
        <Flex justify="center" style={{ marginTop: 30 }}>
          <Typography.Text>
            <Checkbox
              checked={uploadSupport}
              onChange={(e) => {
                setUploadSupport(e.target.checked);
              }}
            >
              允许更新已有用户的数据
            </Checkbox>
          </Typography.Text>
        </Flex>
      </Modal>
    </PageContainer>
  );
}
